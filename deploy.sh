# Deployment Script for Click Race Game

# Build the SAM application
echo "🏗️ Building SAM application..."
sam build

# Deploy to AWS
echo "🚀 Deploying to AWS..."
sam deploy \
  --stack-name click-race-game \
  --s3-bucket ${S3_BUCKET:-""} \
  --region ${AWS_REGION:-"us-east-1"} \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides Stage=prod \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

# Get the WebSocket endpoint and S3 bucket from outputs
echo "📋 Getting deployment outputs..."
WEBSOCKET_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name click-race-game \
  --query 'Stacks[0].Outputs[?OutputKey==`WebSocketEndpoint`].OutputValue' \
  --output text)

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name click-race-game \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucket`].OutputValue' \
  --output text)

echo "🔗 WebSocket Endpoint: $WEBSOCKET_ENDPOINT"
echo "🪣 Frontend Bucket: $FRONTEND_BUCKET"

# Update the frontend JS with the WebSocket endpoint
echo "📝 Updating frontend with WebSocket endpoint..."
sed -i "s|wss://YOUR_API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com/prod|$WEBSOCKET_ENDPOINT|g" frontend/app.js

# Upload frontend to S3
echo "☁️ Uploading frontend to S3..."
aws s3 sync frontend/ s3://$FRONTEND_BUCKET --delete

# Get the website URL
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name click-race-game \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
  --output text)

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎮 Game URL: $FRONTEND_URL"
echo "🔗 WebSocket Endpoint: $WEBSOCKET_ENDPOINT"
