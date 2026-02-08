# 🏆 Click Race - Real-time Multiplayer Game

A simple but functional real-time multiplayer "click race" game built with AWS serverless architecture. Players compete to click a button the most times within a 30-second time limit.

![Architecture](https://img.shields.io/badge/AWS-Serverless-orange)
![WebSocket](https://img.shields.io/badge/Protocol-WebSocket-green)
![DynamoDB](https://img.shields.io/badge/Database-DynamoDB-blue)

## 🎮 Features

- **Real-time multiplayer**: WebSocket connections for instant updates
- **Room-based gameplay**: Join rooms with friends using a shared room ID
- **Live leaderboard**: See scores update in real-time as players click
- **30-second rounds**: Fast-paced, competitive gameplay
- **Responsive design**: Works on desktop and mobile devices

## 🏗️ Architecture

```
┌─────────────┐      WebSocket       ┌──────────────┐
│   Frontend  │◄────────────────────►│  API Gateway │
│  (S3/HTTP)  │                      │  (WebSocket) │
└─────────────┘                      └──────┬───────┘
                                            │
                           ┌────────────────┼────────────────┐
                           │                │                │
                    ┌──────▼──────┐  ┌─────▼──────┐  ┌──────▼──────┐
                    │   Connect   │  │ Disconnect │  │   Game      │
                    │   Lambda    │  │   Lambda   │  │   Lambda    │
                    └──────┬──────┘  └─────┬──────┘  └──────┬──────┘
                           │                │                │
                           └────────────────┼────────────────┘
                                            │
                                    ┌───────▼────────┐
                                    │   DynamoDB     │
                                    │  (Game State)  │
                                    └────────────────┘
```

### AWS Services Used

| Service | Purpose |
|---------|---------|
| **API Gateway (WebSocket)** | Real-time bidirectional communication |
| **Lambda** | Game logic handlers (Connect, Disconnect, Game actions) |
| **DynamoDB** | Game state, player scores, and leaderboard |
| **S3** | Static website hosting for the frontend |

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with credentials
- AWS SAM CLI installed
- Node.js 18+ installed

### Deployment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/BenLirio/click-race-game.git
   cd click-race-game
   ```

2. **Deploy with SAM:**
   ```bash
   sam build
   sam deploy --guided
   ```

3. **Update frontend with WebSocket endpoint:**
   After deployment, note the WebSocket endpoint from the outputs and update `frontend/app.js`:
   ```javascript
   const WS_ENDPOINT = 'wss://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod';
   ```

4. **Upload frontend to S3:**
   ```bash
   aws s3 sync frontend/ s3://click-race-frontend-YOUR_ACCOUNT_ID --delete
   ```

5. **Access the game:**
   Visit the S3 website URL from the deployment outputs.

## 🎮 How to Play

1. **Open the game** in your browser
2. **Enter your name** and a room ID
3. **Share the room ID** with friends
4. **Click the button** as fast as you can when the game starts!
5. **Highest score in 30 seconds wins!**

## 🔌 API Messages

### Client → Server

| Action | Description |
|--------|-------------|
| `join` | Join a game room with player name |
| `click` | Register a click during gameplay |
| `getLeaderboard` | Request current leaderboard |
| `getRoomState` | Request current room state |

### Server → Client

| Type | Description |
|------|-------------|
| `joined` | Confirmation of successful join |
| `playerJoined` | Notification of new player |
| `scoreUpdate` | Updated scores and timer |
| `gameEnded` | Game over with final results |
| `clickRegistered` | Click confirmation |
| `leaderboard` | Current leaderboard data |

## 📁 Project Structure

```
click-race-game/
├── backend/
│   └── functions/
│       ├── connect.js      # WebSocket connect handler
│       ├── disconnect.js   # WebSocket disconnect handler
│       └── game.js         # Main game logic handler
├── frontend/
│   ├── index.html          # Game UI
│   └── app.js              # Game client logic
├── template.yaml           # AWS SAM template
├── package.json
└── README.md
```

## 🔧 Development

### Local Testing

```bash
# Start local API (for HTTP APIs)
sam local start-api

# Or use SAM sync for faster iteration
sam sync --stack-name click-race-game --watch
```

### Testing WebSocket Locally

Use [wscat](https://github.com/websockets/wscat) for testing:
```bash
npm install -g wscat
wscat -c wss://YOUR_ENDPOINT/prod
```

## 📝 License

MIT License - feel free to use and modify!

## 🙏 Credits

Built with ❤️ using AWS Serverless technologies.
