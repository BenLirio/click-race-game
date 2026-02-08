const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    console.log('Connect event:', JSON.stringify(event));
    
    const connectionId = event.requestContext.connectionId;
    const timestamp = Date.now();
    
    try {
        // Store connection in DynamoDB
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: {
                PK: `CONN#${connectionId}`,
                SK: 'METADATA',
                connectionId: connectionId,
                connectedAt: timestamp,
                ttl: Math.floor(timestamp / 1000) + 86400 // 24 hours TTL
            }
        }).promise();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Connected successfully' })
        };
    } catch (error) {
        console.error('Error in connect:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to connect' })
        };
    }
};
