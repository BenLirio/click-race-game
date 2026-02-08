const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    console.log('Disconnect event:', JSON.stringify(event));
    
    const connectionId = event.requestContext.connectionId;
    
    try {
        // Get connection info
        const result = await dynamodb.get({
            TableName: TABLE_NAME,
            Key: {
                PK: `CONN#${connectionId}`,
                SK: 'METADATA'
            }
        }).promise();
        
        const connection = result.Item;
        
        // Remove player from room if they were in one
        if (connection && connection.roomId) {
            await dynamodb.update({
                TableName: TABLE_NAME,
                Key: {
                    PK: `ROOM#${connection.roomId}`,
                    SK: 'METADATA'
                },
                UpdateExpression: 'DELETE players :player',
                ExpressionAttributeValues: {
                    ':player': dynamodb.createSet([connection.playerName])
                }
            }).promise();
        }
        
        // Delete connection
        await dynamodb.delete({
            TableName: TABLE_NAME,
            Key: {
                PK: `CONN#${connectionId}`,
                SK: 'METADATA'
            }
        }).promise();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Disconnected successfully' })
        };
    } catch (error) {
        console.error('Error in disconnect:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to disconnect' })
        };
    }
};
