/**
 * Click Race - Multiplayer Game Client
 * Connects via WebSocket to AWS API Gateway
 */

// WebSocket endpoint - will be updated after deployment
const WS_ENDPOINT = 'wss://YOUR_API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com/prod';

// Game state
let ws = null;
let playerName = '';
let roomId = '';
let clicks = 0;
let isConnected = false;
let isGameActive = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// DOM Elements
const statusEl = document.getElementById('status');
const joinSection = document.getElementById('joinSection');
const gameSection = document.getElementById('gameSection');
const winnerSection = document.getElementById('winnerSection');
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const clickBtn = document.getElementById('clickBtn');
const clickCountEl = document.getElementById('clickCount');
const timerEl = document.getElementById('timer');
const gameStatusEl = document.getElementById('gameStatus');
const playersListEl = document.getElementById('playersList');
const leaderboardListEl = document.getElementById('leaderboardList');
const connectionInfoEl = document.getElementById('connectionInfo');
const playAgainBtn = document.getElementById('playAgainBtn');
const newGameBtn = document.getElementById('newGameBtn');
const winnerTextEl = document.getElementById('winnerText');
const finalLeaderboardEl = document.getElementById('finalLeaderboard');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    setupEventListeners();
});

function setupEventListeners() {
    // Form inputs
    playerNameInput.addEventListener('input', validateForm);
    roomIdInput.addEventListener('input', validateForm);
    
    // Join button
    joinBtn.addEventListener('click', joinGame);
    
    // Click button - support both mouse and touch
    clickBtn.addEventListener('mousedown', handleClick);
    clickBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleClick();
    });
    
    // Prevent double-tap zoom on mobile
    clickBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
    });
    
    // Spacebar support for clicking
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && isGameActive && !clickBtn.disabled) {
            e.preventDefault();
            handleClick();
        }
    });
    
    // Play again buttons
    playAgainBtn.addEventListener('click', resetGame);
    newGameBtn.addEventListener('click', resetGame);
}

function validateForm() {
    joinBtn.disabled = !(playerNameInput.value.trim() && roomIdInput.value.trim());
}

function connectWebSocket() {
    updateConnectionStatus('Connecting...', 'connecting');
    
    try {
        ws = new WebSocket(WS_ENDPOINT);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            isConnected = true;
            reconnectAttempts = 0;
            updateConnectionStatus('Connected', 'connected');
            statusEl.textContent = 'Connected! Enter your details to join.';
            statusEl.className = 'status connected';
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received:', data);
            handleMessage(data);
        };
        
        ws.onclose = () => {
            console.log('WebSocket closed');
            isConnected = false;
            updateConnectionStatus('Disconnected', 'error');
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                statusEl.textContent = `Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`;
                statusEl.className = 'status connecting';
                setTimeout(connectWebSocket, 3000);
            } else {
                statusEl.textContent = 'Connection failed. Please refresh the page.';
                statusEl.className = 'status error';
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus('Error', 'error');
        };
    } catch (error) {
        console.error('Failed to connect:', error);
        statusEl.textContent = 'Failed to connect to server.';
        statusEl.className = 'status error';
    }
}

function updateConnectionStatus(text, type) {
    connectionInfoEl.textContent = text;
    connectionInfoEl.className = 'connection-info ' + type;
}

function sendMessage(action, data = {}) {
    if (ws && isConnected) {
        ws.send(JSON.stringify({
            action: action,
            ...data
        }));
    }
}

function handleMessage(data) {
    switch (data.type) {
        case 'joined':
            handleJoined(data);
            break;
        case 'playerJoined':
            handlePlayerJoined(data);
            break;
        case 'scoreUpdate':
            handleScoreUpdate(data);
            break;
        case 'gameEnded':
            handleGameEnded(data);
            break;
        case 'clickRegistered':
            handleClickRegistered(data);
            break;
        case 'roomState':
            handleRoomState(data);
            break;
        case 'leaderboard':
            updateLeaderboard(data.leaderboard);
            break;
        case 'error':
            console.error('Server error:', data.message);
            statusEl.textContent = 'Error: ' + data.message;
            statusEl.className = 'status error';
            break;
    }
}

function joinGame() {
    playerName = playerNameInput.value.trim();
    roomId = roomIdInput.value.trim();
    
    if (!playerName || !roomId) return;
    
    statusEl.textContent = 'Joining game...';
    statusEl.className = 'status connecting';
    
    sendMessage('join', {
        playerName: playerName,
        roomId: roomId
    });
}

function handleJoined(data) {
    // Switch to game section
    joinSection.classList.remove('active');
    gameSection.classList.add('active');
    
    // Update UI
    updatePlayersList(data.players);
    gameStatusEl.textContent = data.gameState === 'waiting' ? 
        'Waiting for players... First click starts the game!' : 
        'Game in progress!';
    
    // Request current room state
    sendMessage('getRoomState', { roomId: roomId });
}

function handlePlayerJoined(data) {
    updatePlayersList(data.players);
    
    // Show notification
    const newPlayer = data.players[data.players.length - 1];
    if (newPlayer && newPlayer !== playerName) {
        showNotification(`${newPlayer} joined the room!`);
    }
}

function updatePlayersList(players) {
    playersListEl.innerHTML = players.map(p => 
        `<span class="player-tag">${escapeHtml(p)}</span>`
    ).join('');
}

function handleClick() {
    if (!isGameActive && gameStatusEl.textContent.includes('Waiting')) {
        // First click starts the game
        isGameActive = true;
        gameStatusEl.textContent = 'Game started! Click fast!';
        gameStatusEl.className = 'status playing';
        clickBtn.disabled = false;
    }
    
    if (isGameActive) {
        clicks++;
        clickCountEl.textContent = clicks;
        
        // Send click to server
        sendMessage('click', {
            roomId: roomId,
            playerName: playerName
        });
    }
}

function handleClickRegistered(data) {
    // Server confirmed click
    clicks = data.clicks;
    clickCountEl.textContent = clicks;
}

function handleScoreUpdate(data) {
    updateLeaderboard(data.scores);
    
    // Update timer
    if (data.timeRemaining !== undefined) {
        timerEl.textContent = data.timeRemaining;
        
        if (data.timeRemaining <= 5) {
            timerEl.style.color = '#f5576c';
        }
    }
    
    // Enable click button when game starts
    if (data.timeRemaining > 0 && !isGameActive) {
        isGameActive = true;
        clickBtn.disabled = false;
        gameStatusEl.textContent = 'Game in progress! Click fast!';
        gameStatusEl.className = 'status playing';
    }
}

function handleRoomState(data) {
    updatePlayersList(data.players);
    updateLeaderboard(data.scores);
    
    timerEl.textContent = data.timeRemaining;
    
    if (data.gameState === 'playing') {
        isGameActive = true;
        clickBtn.disabled = false;
        gameStatusEl.textContent = 'Game in progress!';
        gameStatusEl.className = 'status playing';
    } else if (data.gameState === 'ended') {
        isGameActive = false;
        clickBtn.disabled = true;
        gameStatusEl.textContent = 'Game ended!';
    }
}

function updateLeaderboard(scores) {
    if (!scores || scores.length === 0) {
        leaderboardListEl.innerHTML = `
            <li class="score-item">
                <span class="rank">-</span>
                <span class="name">No scores yet</span>
                <span class="clicks">-</span>
            </li>
        `;
        return;
    }
    
    leaderboardListEl.innerHTML = scores.map((score, index) => {
        const isCurrentPlayer = score.name === playerName;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        return `
            <li class="score-item ${isCurrentPlayer ? 'current-player' : ''}">
                <span class="rank">${medal}</span>
                <span class="name">${escapeHtml(score.name)} ${isCurrentPlayer ? '(You)' : ''}</span>
                <span class="clicks">${score.clicks}</span>
            </li>
        `;
    }).join('');
}

function handleGameEnded(data) {
    isGameActive = false;
    clickBtn.disabled = true;
    
    // Switch to winner section
    gameSection.classList.remove('active');
    winnerSection.classList.add('active');
    
    // Update winner text
    if (data.winner) {
        if (data.winner.name === playerName) {
            winnerTextEl.innerHTML = `<strong>🎉 Congratulations! You won with ${data.winner.clicks} clicks!</strong>`;
        } else {
            winnerTextEl.innerHTML = `<strong>${escapeHtml(data.winner.name)}</strong> won with <strong>${data.winner.clicks}</strong> clicks!`;
        }
    } else {
        winnerTextEl.textContent = 'Game ended!';
    }
    
    // Update final leaderboard
    finalLeaderboardEl.innerHTML = data.finalScores.map((score, index) => {
        const isCurrentPlayer = score.name === playerName;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        return `
            <li class="score-item ${isCurrentPlayer ? 'current-player' : ''}">
                <span class="rank">${medal}</span>
                <span class="name">${escapeHtml(score.name)}</span>
                <span class="clicks">${score.clicks} clicks</span>
            </li>
        `;
    }).join('');
}

function resetGame() {
    // Reset state
    clicks = 0;
    isGameActive = false;
    clickCountEl.textContent = '0';
    timerEl.textContent = '30';
    timerEl.style.color = '#f5576c';
    clickBtn.disabled = true;
    
    // Switch back to join section
    winnerSection.classList.remove('active');
    gameSection.classList.remove('active');
    joinSection.classList.add('active');
    
    // Clear inputs
    playerNameInput.value = '';
    roomIdInput.value = '';
    validateForm();
    
    statusEl.textContent = 'Connected! Enter your details to join.';
    statusEl.className = 'status connected';
}

function showNotification(message) {
    // Simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: 600;
        z-index: 1000;
        animation: slideDown 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
