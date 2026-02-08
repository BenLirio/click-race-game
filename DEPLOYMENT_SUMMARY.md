# 🎮 Click Race - Deployment Summary

## ✅ What's Been Created

### GitHub Repository
**URL:** https://github.com/BenLirio/click-race-game

The repository contains a complete multiplayer "Click Race" game with:

### Project Structure
```
click-race-game/
├── backend/
│   └── functions/
│       ├── connect.js          # WebSocket connection handler
│       ├── disconnect.js       # WebSocket disconnection handler
│       └── game.js             # Main game logic (join, click, leaderboard)
├── frontend/
│   ├── index.html              # Game UI with responsive design
│   └── app.js                  # Game client with WebSocket connection
├── template.yaml               # AWS SAM template for infrastructure
├── deploy.sh                   # Deployment script
├── package.json
├── README.md
├── DEPLOY.md                   # Detailed deployment guide
└── .gitignore
```

### AWS Architecture
- **API Gateway (WebSocket)**: Real-time bidirectional communication
- **Lambda Functions**: 
  - `connect`: Handles new WebSocket connections
  - `disconnect`: Cleans up when players leave
  - `game`: Handles join, click, and leaderboard actions
- **DynamoDB**: Stores game state, player scores, and leaderboard data
- **S3**: Hosts the static frontend website

### Game Features
- ✅ Join game rooms with custom room ID
- ✅ Real-time multiplayer (see other players join)
- ✅ 30-second click race competition
- ✅ Live leaderboard updates during gameplay
- ✅ Final results with winner announcement
- ✅ Works on desktop and mobile
- ✅ Keyboard (spacebar) and touch support

---

## 🚀 How to Deploy

### Prerequisites
1. AWS CLI installed and configured
2. AWS SAM CLI installed
3. AWS credentials with permissions for:
   - CloudFormation
   - API Gateway
   - Lambda
   - DynamoDB
   - S3

### Deployment Steps

#### Option 1: Using the Deploy Script (Easiest)

```bash
# Clone the repository
git clone https://github.com/BenLirio/click-race-game.git
cd click-race-game

# Configure AWS credentials
aws configure

# Install SAM CLI if not already installed
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Run the deployment script
./deploy.sh
```

#### Option 2: Manual Deployment

```bash
# 1. Build the SAM application
sam build

# 2. Deploy (first time will be interactive)
sam deploy --guided

# Follow the prompts and note the WebSocket endpoint from the outputs

# 3. Update the WebSocket endpoint in the frontend
# Edit frontend/app.js and replace:
# const WS_ENDPOINT = 'wss://YOUR_API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com/prod';
# With the actual endpoint from step 2

# 4. Upload frontend to S3
aws s3 sync frontend/ s3://YOUR_FRONTEND_BUCKET --delete

# 5. Access your game at the FrontendURL from the CloudFormation outputs
```

---

## 🎯 After Deployment

### 1. Get Your Game URL
After deployment, the CloudFormation outputs will show:
- **FrontendURL**: `http://click-race-frontend-ACCOUNT_ID.s3-website-REGION.amazonaws.com`
- **WebSocketEndpoint**: `wss://API_ID.execute-api.REGION.amazonaws.com/prod`

### 2. Test the Game
1. Open the FrontendURL in your browser
2. Enter your name and a room ID (e.g., "room123")
3. Open another browser/incognito window with the same room ID
4. Click the button to start and compete!

### 3. Share with Friends
Share the room ID with friends - they can join from anywhere using the same game URL and room ID.

---

## 📊 Expected Costs

This serverless architecture is very cost-effective:
- **API Gateway WebSocket**: ~$1 per million messages
- **Lambda**: Free tier includes 1M requests/month
- **DynamoDB**: On-demand pricing, minimal for this use case
- **S3**: Negligible for static website hosting

**Estimated monthly cost for light usage: $0-5**

---

## 🔧 Customization

### Change Game Duration
Edit `backend/functions/game.js`:
```javascript
room.gameDuration = 30; // Change to desired seconds
```

### Change Region
Update `template.yaml` or use `--region` flag during deployment.

### Styling
Modify `frontend/index.html` CSS section to change colors, fonts, etc.

---

## 🐛 Troubleshooting

### WebSocket Not Connecting
1. Verify the WebSocket endpoint URL is correct in `frontend/app.js`
2. Check API Gateway console to ensure the WebSocket API is deployed
3. Check Lambda logs in CloudWatch for errors

### Game Not Updating
1. Check browser console for JavaScript errors
2. Verify WebSocket connection is established (look for "Connected" in bottom-right)
3. Ensure both players are in the same room ID

### Deployment Fails
1. Check AWS credentials are valid: `aws sts get-caller-identity`
2. Ensure SAM CLI is installed: `sam --version`
3. Check CloudFormation events for specific errors

---

## 📚 Resources

- **GitHub Repo**: https://github.com/BenLirio/click-race-game
- **AWS SAM Docs**: https://docs.aws.amazon.com/serverless-application-model/
- **API Gateway WebSocket**: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html

---

## 🎉 Success!

Once deployed, you'll have a fully functional real-time multiplayer game running on AWS serverless infrastructure. The game demonstrates:
- WebSocket API for real-time communication
- Lambda functions for serverless compute
- DynamoDB for fast, scalable data storage
- S3 for static website hosting

Enjoy your game! 🎮
