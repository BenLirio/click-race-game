const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;
const API_ENDPOINT = process.env.WEBSOCKET_API_ENDPOINT;

const apigatewaymanagementapi = new AWS.ApiGatewayManagementApi({
    endpoint: API_ENDPOINT.replace('https://', '').replace('wss://', '')
});

exports.handler = async (event) => {
    console.log('Game event:', JSON.stringify(event));
    
    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body || '{}');
    const action = body.action;
    
    try {
        switch (action) {
            case 'join':
                return await handleJoin(connectionId, body);
            case 'click':
                return await handleClick(connectionId, body);
            case 'getLeaderboard':
                return await getLeaderboard(connectionId, body);
            case 'getRoomState':
                return await getRoomState(connectionId, body);
            default:
                return await sendMessage(connectionId, { 
                    type: 'error', 
                    message: 'Unknown action' 
                });
        }
    } catch (error) {
        console.error('Error handling action:', error);
        return await sendMessage(connectionId, { 
            type: 'error', 
            message: error.message 
        });
    }
};

async function handleJoin(connectionId, data) {
    const { playerName, roomId } = data;
    
    if (!playerName || !roomId) {
        return await sendMessage(connectionId, {
            type: 'error',
            message: 'playerName and roomId are required'
        });
    }
    
    // Update connection with player info
    await dynamodb.update({
        TableName: TABLE_NAME,
        Key: {
            PK: `CONN#${connectionId}`,
            SK: 'METADATA'
        },
        UpdateExpression: 'SET playerName = :playerName, roomId = :roomId',
        ExpressionAttributeValues: {
            ':playerName': playerName,
            ':roomId': roomId
        }
    }).promise();
    
    // Get or create room
    const roomResult = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: {
            PK: `ROOM#${roomId}`,
            SK: 'METADATA'
        }
    }).promise();
    
    let room = roomResult.Item;
    
    if (!room) {
        // Create new room
        room = {
            PK: `ROOM#${roomId}`,
            SK: 'METADATA',
            roomId: roomId,
            players: {},
            gameState: 'waiting', // waiting, playing, ended
            createdAt: Date.now(),
            gameDuration: 30 // 30 seconds game
        };
    }
    
    // Add player to room
    room.players[playerName] = {
        name: playerName,
        clicks: 0,
        joinedAt: Date.now(),
        connectionId: connectionId
    };
    
    // Save room
    await dynamodb.put({
        TableName: TABLE_NAME,
        Item: room
    }).promise();
    
    // Save player score entry for leaderboard
    await dynamodb.put({
        TableName: TABLE_NAME,
        Item: {
            PK: `SCORE#${roomId}`,
            SK: `PLAYER#${playerName}`,
            GSI1PK: `LEADERBOARD#${roomId}`,
            GSI1SK: 0,
            playerName: playerName,
            clicks: 0,
            roomId: roomId
        }
    }).promise();
    
    // Notify all players in room
    await broadcastToRoom(roomId, {
        type: 'playerJoined',
        playerName: playerName,
        players: Object.keys(room.players),
        gameState: room.gameState
    }, connectionId);
    
    // Send confirmation to joining player
    return await sendMessage(connectionId, {
        type: 'joined',
        roomId: roomId,
        playerName: playerName,
        players: Object.keys(room.players),
        gameState: room.gameState
    });
}

async function handleClick(connectionId, data) {
    const { roomId, playerName } = data;
    
    // Get room
    const roomResult = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: {
            PK: `ROOM#${roomId}`,
            SK: 'METADATA'
        }
    }).promise();
    
    const room = roomResult.Item;
    
    if (!room) {
        return await sendMessage(connectionId, {
            type: 'error',
            message: 'Room not found'
        });
    }
    
    // Start game if not started
    if (room.gameState === 'waiting') {
        room.gameState = 'playing';
        room.gameStartedAt = Date.now();
        room.gameEndsAt = Date.now() + (room.gameDuration * 1000);
        
        // Schedule game end
        setTimeout(() => endGame(roomId), room.gameDuration * 1000);
    }
    
    if (room.gameState !== 'playing') {
        return await sendMessage(connectionId, {
            type: 'error',
            message: 'Game is not active'
        });
    }
    
    // Increment player clicks
    if (room.players[playerName]) {
        room.players[playerName].clicks = (room.players[playerName].clicks || 0) + 1;
        
        // Save room
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: room
        }).promise();
        
        // Update leaderboard
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: {
                PK: `SCORE#${roomId}`,
                SK: `PLAYER#${playerName}`,
                GSI1PK: `LEADERBOARD#${roomId}`,
                GSI1SK: room.players[playerName].clicks,
                playerName: playerName,
                clicks: room.players[playerName].clicks,
                roomId: roomId,
                updatedAt: Date.now()
            }
        }).promise();
        
        // Broadcast updated scores
        const scores = Object.values(room.players).map(p => ({
            name: p.name,
            clicks: p.clicks || 0
        })).sort((a, b) => b.clicks - a.clicks);
        
        await broadcastToRoom(roomId, {
            type: 'scoreUpdate',
            scores: scores,
            timeRemaining: Math.max(0, Math.ceil((room.gameEndsAt - Date.now()) / 1000))
        });
        
        return await sendMessage(connectionId, {
            type: 'clickRegistered',
            clicks: room.players[playerName].clicks
        });
    }
    
    return await sendMessage(connectionId, {
        type: 'error',
        message: 'Player not found in room'
    });
}

async function getLeaderboard(connectionId, data) {
    const { roomId } = data;
    
    const result = await dynamodb.query({
        TableName: TABLE_NAME,
        IndexName: 'LeaderboardIndex',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
            ':pk': `LEADERBOARD#${roomId}`
        },
        ScanIndexForward: false,
        Limit: 10
    }).promise();
    
    const leaderboard = result.Items.map(item => ({
        name: item.playerName,
        clicks: item.clicks
    }));
    
    return await sendMessage(connectionId, {
        type: 'leaderboard',
        roomId: roomId,
        leaderboard: leaderboard
    });
}

async function getRoomState(connectionId, data) {
    const { roomId } = data;
    
    const roomResult = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: {
            PK: `ROOM#${roomId}`,
            SK: 'METADATA'
        }
    }).promise();
    
    const room = roomResult.Item;
    
    if (!room) {
        return await sendMessage(connectionId, {
            type: 'error',
            message: 'Room not found'
        });
    }
    
    const scores = Object.values(room.players).map(p => ({
        name: p.name,
        clicks: p.clicks || 0
    })).sort((a, b) => b.clicks - a.clicks);
    
    return await sendMessage(connectionId, {
        type: 'roomState',
        roomId: roomId,
        gameState: room.gameState,
        players: Object.keys(room.players),
        scores: scores,
        timeRemaining: room.gameEndsAt ? Math.max(0, Math.ceil((room.gameEndsAt - Date.now()) / 1000)) : room.gameDuration
    });
}

async function endGame(roomId) {
    try {
        const roomResult = await dynamodb.get({
            TableName: TABLE_NAME,
            Key: {
                PK: `ROOM#${roomId}`,
                SK: 'METADATA'
            }
        }).promise();
        
        const room = roomResult.Item;
        
        if (room && room.gameState === 'playing') {
            room.gameState = 'ended';
            
            await dynamodb.put({
                TableName: TABLE_NAME,
                Item: room
            }).promise();
            
            const scores = Object.values(room.players).map(p => ({
                name: p.name,
                clicks: p.clicks || 0
            })).sort((a, b) => b.clicks - a.clicks);
            
            await broadcastToRoom(roomId, {
                type: 'gameEnded',
                finalScores: scores,
                winner: scores.length > 0 ? scores[0] : null
            });
        }
    } catch (error) {
        console.error('Error ending game:', error);
    }
}

async function sendMessage(connectionId, data) {
    try {
        await apigatewaymanagementapi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify(data)
        }).promise();
        
        return { statusCode: 200, body: 'Message sent' };
    } catch (error) {
        console.error('Error sending message:', error);
        return { statusCode: 500, body: 'Failed to send message' };
    }
}

async function broadcastToRoom(roomId, data, excludeConnectionId = null) {
    try {
        // Get all connections in room
        const result = await dynamodb.scan({
            TableName: TABLE_NAME,
            FilterExpression: 'roomId = :roomId',
            ExpressionAttributeValues: {
                ':roomId': roomId
            }
        }).promise();
        
        const promises = result.Items
            .filter(item => item.connectionId && item.connectionId !== excludeConnectionId)
            .map(item => {
                return sendMessage(item.connectionId, data).catch(err => {
                    console.error(`Failed to send to ${item.connectionId}:`, err);
                });
            });
        
        await Promise.all(promises);
    } catch (error) {
        console.error('Error broadcasting:', error);
    }
}
