// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDemoKey123456789",
    authDomain: "king-of-diamonds-demo.firebaseapp.com",
    databaseURL: "https://king-of-diamonds-demo-default-rtdb.firebaseio.com",
    projectId: "king-of-diamonds-demo",
    storageBucket: "king-of-diamonds-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

// Initialize Firebase
let database;
let gameRef;
let playersRef;
let currentPlayer = null;
let gameId = 'game-room-1'; // Simple game room for now
let gameTimer = null;

// Initialize Firebase if available
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        gameRef = database.ref(`games/${gameId}`);
        playersRef = gameRef.child('players');
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        // Fallback to local mode if Firebase is not available
        console.warn('Running in local demo mode without real-time synchronization');
    }
}

// Game State
const GameState = {
    LOBBY: 'lobby',
    INSTRUCTIONS: 'instructions',
    PLAYING: 'playing',
    RESULTS: 'results'
};

let currentState = GameState.LOBBY;
let localPlayers = {}; // Fallback for local mode

// DOM Elements
const lobbyScreen = document.getElementById('lobby-screen');
const instructionsScreen = document.getElementById('instructions-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');

const playerNameInput = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const playerCountSpan = document.getElementById('player-count');
const playersList = document.getElementById('players-list');
const waitingMessage = document.getElementById('waiting-message');

const startGameBtn = document.getElementById('start-game-btn');
const timerDisplay = document.getElementById('timer');
const numberInput = document.getElementById('number-input');
const submitNumberBtn = document.getElementById('submit-number-btn');
const playersStatusList = document.getElementById('players-status-list');

const averageSpan = document.getElementById('average');
const targetSpan = document.getElementById('target');
const winnerText = document.getElementById('winner-text');
const resultsList = document.getElementById('results-list');
const playAgainBtn = document.getElementById('play-again-btn');

// Event Listeners
joinBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', startGame);
submitNumberBtn.addEventListener('click', submitNumber);
playAgainBtn.addEventListener('click', resetGame);

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
});

numberInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitNumber();
});

// Initialize game
function init() {
    if (database) {
        // Listen for player changes
        playersRef.on('value', (snapshot) => {
            const players = snapshot.val() || {};
            updatePlayersList(players);
            checkGameStart(players);
        });

        // Listen for game state changes
        gameRef.child('state').on('value', (snapshot) => {
            const state = snapshot.val();
            if (state && state !== currentState) {
                handleStateChange(state);
            }
        });

        // Listen for timer updates
        gameRef.child('timer').on('value', (snapshot) => {
            const timer = snapshot.val();
            if (timer !== null) {
                updateTimer(timer);
            }
        });
    }
}

// Join Game
function joinGame() {
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        alert('Por favor ingresa tu nombre');
        return;
    }

    if (playerName.length < 2) {
        alert('El nombre debe tener al menos 2 caracteres');
        return;
    }

    const playerId = generatePlayerId();
    currentPlayer = {
        id: playerId,
        name: playerName,
        number: null,
        ready: false,
        joinedAt: Date.now()
    };

    if (database) {
        // Check if room is full
        playersRef.once('value').then((snapshot) => {
            const players = snapshot.val() || {};
            const playerCount = Object.keys(players).length;

            if (playerCount >= 5) {
                alert('La sala está llena. Por favor espera a que comience una nueva partida.');
                return;
            }

            // Add player to Firebase
            playersRef.child(playerId).set(currentPlayer);
            playerNameInput.disabled = true;
            joinBtn.disabled = true;
        });
    } else {
        // Local mode
        localPlayers[playerId] = currentPlayer;
        updatePlayersList(localPlayers);
        playerNameInput.disabled = true;
        joinBtn.disabled = true;
    }
}

// Update Players List
function updatePlayersList(players) {
    const playerArray = Object.values(players);
    playerCountSpan.textContent = playerArray.length;
    
    playersList.innerHTML = '';
    playersStatusList.innerHTML = '';
    
    playerArray.forEach(player => {
        // Lobby list
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card' + (player.ready ? ' ready' : '');
        playerCard.innerHTML = `
            <div class="player-name">${escapeHtml(player.name)}</div>
            <div class="player-status">${player.ready ? '✓ Listo' : 'Esperando...'}</div>
        `;
        playersList.appendChild(playerCard);

        // Game status list
        const statusCard = document.createElement('div');
        statusCard.className = 'player-card' + (player.number !== null ? ' ready' : '');
        statusCard.innerHTML = `
            <div class="player-name">${escapeHtml(player.name)}</div>
            <div class="player-status">${player.number !== null ? '✓ Número elegido' : 'Pensando...'}</div>
        `;
        playersStatusList.appendChild(statusCard);
    });

    // Show waiting message if less than 2 players
    if (playerArray.length < 2 && currentPlayer) {
        waitingMessage.style.display = 'block';
    } else {
        waitingMessage.style.display = 'none';
    }
}

// Check if game can start
function checkGameStart(players) {
    const playerArray = Object.values(players);
    
    // Game can start with 2-5 players
    if (playerArray.length >= 2 && playerArray.length <= 5) {
        if (currentPlayer && currentState === GameState.LOBBY) {
            // Automatically show instructions after a short delay
            if (playerArray.length >= 2 && !currentPlayer.ready) {
                setTimeout(() => {
                    if (currentState === GameState.LOBBY) {
                        switchScreen(GameState.INSTRUCTIONS);
                    }
                }, 2000);
            }
        }
    }
}

// Start Game
function startGame() {
    if (!currentPlayer) return;

    if (database) {
        // Mark player as ready
        playersRef.child(currentPlayer.id).update({ ready: true });

        // Check if all players are ready
        playersRef.once('value').then((snapshot) => {
            const players = snapshot.val() || {};
            const playerArray = Object.values(players);
            const allReady = playerArray.every(p => p.ready);

            if (allReady && playerArray.length >= 2) {
                // Start the game
                gameRef.update({
                    state: GameState.PLAYING,
                    timer: 30,
                    startedAt: Date.now()
                });
                switchScreen(GameState.PLAYING);
                startTimer();
            } else {
                switchScreen(GameState.PLAYING);
                startTimer();
            }
        });
    } else {
        // Local mode
        switchScreen(GameState.PLAYING);
        startTimer();
    }
}

// Start Timer
function startTimer() {
    let timeLeft = 30;
    
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimer(timeLeft);
        
        if (database) {
            gameRef.update({ timer: timeLeft });
        }
        
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            endGame();
        }
    }, 1000);
}

// Update Timer Display
function updateTimer(time) {
    timerDisplay.textContent = time;
    
    if (time <= 10) {
        timerDisplay.style.color = '#ff6b6b';
    } else {
        timerDisplay.style.color = '#ffc107';
    }
}

// Submit Number
function submitNumber() {
    const number = parseInt(numberInput.value);
    
    if (isNaN(number) || number < 0 || number > 100) {
        alert('Por favor ingresa un número válido entre 0 y 100');
        return;
    }

    if (!currentPlayer) return;

    currentPlayer.number = number;
    
    if (database) {
        playersRef.child(currentPlayer.id).update({ number: number });
    } else {
        localPlayers[currentPlayer.id].number = number;
        updatePlayersList(localPlayers);
    }

    numberInput.disabled = true;
    submitNumberBtn.disabled = true;
    
    // Check if all players submitted
    checkAllSubmitted();
}

// Check if all players submitted
function checkAllSubmitted() {
    if (database) {
        playersRef.once('value').then((snapshot) => {
            const players = snapshot.val() || {};
            const playerArray = Object.values(players);
            const allSubmitted = playerArray.every(p => p.number !== null);
            
            if (allSubmitted) {
                endGame();
            }
        });
    } else {
        const playerArray = Object.values(localPlayers);
        const allSubmitted = playerArray.every(p => p.number !== null);
        
        if (allSubmitted) {
            endGame();
        }
    }
}

// End Game
function endGame() {
    if (gameTimer) clearInterval(gameTimer);
    
    if (database) {
        playersRef.once('value').then((snapshot) => {
            const players = snapshot.val() || {};
            calculateResults(players);
        });
    } else {
        calculateResults(localPlayers);
    }
}

// Calculate Results
function calculateResults(players) {
    const playerArray = Object.values(players).filter(p => p.number !== null);
    
    if (playerArray.length === 0) {
        alert('No hay jugadores con números válidos');
        return;
    }

    // Calculate average
    const sum = playerArray.reduce((acc, p) => acc + p.number, 0);
    const average = sum / playerArray.length;
    const target = average * 0.8;

    // Calculate distances and sort
    const results = playerArray.map(player => ({
        ...player,
        distance: Math.abs(player.number - target)
    })).sort((a, b) => a.distance - b.distance);

    // Display results
    displayResults(results, average, target);
    switchScreen(GameState.RESULTS);
}

// Display Results
function displayResults(results, average, target) {
    averageSpan.textContent = average.toFixed(2);
    targetSpan.textContent = target.toFixed(2);

    const winner = results[0];
    winnerText.textContent = `🏆 ¡${escapeHtml(winner.name)} es el ganador! 🏆`;

    resultsList.innerHTML = '';
    
    results.forEach((player, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item' + (index === 0 ? ' winner' : '');
        resultItem.innerHTML = `
            <div class="player-info">
                <div class="player-rank">${index + 1}°</div>
                <div class="player-details">
                    <div class="name">${escapeHtml(player.name)}</div>
                    <div class="number">Número elegido: ${player.number}</div>
                </div>
            </div>
            <div class="distance">Distancia: ${player.distance.toFixed(2)}</div>
        `;
        resultsList.appendChild(resultItem);
    });
}

// Reset Game
function resetGame() {
    if (database) {
        // Clear all players
        gameRef.remove().then(() => {
            location.reload();
        });
    } else {
        location.reload();
    }
}

// Switch Screen
function switchScreen(newState) {
    currentState = newState;
    
    lobbyScreen.classList.remove('active');
    instructionsScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultsScreen.classList.remove('active');
    
    switch (newState) {
        case GameState.LOBBY:
            lobbyScreen.classList.add('active');
            break;
        case GameState.INSTRUCTIONS:
            instructionsScreen.classList.add('active');
            break;
        case GameState.PLAYING:
            gameScreen.classList.add('active');
            break;
        case GameState.RESULTS:
            resultsScreen.classList.add('active');
            break;
    }
}

// Handle State Change from Firebase
function handleStateChange(newState) {
    switchScreen(newState);
    
    if (newState === GameState.PLAYING) {
        startTimer();
    }
}

// Generate Player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize on load
init();
