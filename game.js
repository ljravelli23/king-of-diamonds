/**
 * KING OF DIAMONDS - ALICE IN BORDERLAND EDITION
 * Full Game Implementation: Graphics, Mechanics & Multi-player
 */

const GameState = {
    LOBBY: 'lobby',
    INSTRUCTIONS: 'instructions',
    PLAYING: 'playing',
    RESULTS: 'results',
    GAME_OVER: 'game_over'
};

const ScreenMap = {
    [GameState.LOBBY]: 'lobby',
    [GameState.INSTRUCTIONS]: 'instructions',
    [GameState.PLAYING]: 'game',
    [GameState.RESULTS]: 'results'
};

// --- GLOBAL STATE ---
let state = {
    me: { id: '', name: '', score: 0, choice: null, ready: false, isEliminated: false },
    players: [],
    roomID: '',
    isHost: false,
    currentState: GameState.LOBBY,
    round: 1,
    maxPlayers: 5,
    timer: 30,
    timerInterval: null,
    rulesActive: [],
    instructionTimer: 300, // 5 minutes in seconds
    instructionTimerInterval: null,
    ruleChanged: false
};

// --- NETWORKING ---
let peer = null;
let hostConn = null;
let clientConns = {};

// --- DOM ELEMENTS ---
const UI = {
    screens: {
        lobby: document.getElementById('lobby-screen'),
        instructions: document.getElementById('instructions-screen'),
        game: document.getElementById('game-screen'),
        results: document.getElementById('results-screen')
    },
    playerName: document.getElementById('player-name'),
    roomIDInput: document.getElementById('room-id-input'),
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomBtn: document.getElementById('join-room-btn'),
    hostSettings: document.getElementById('host-settings'),
    roomCapacity: document.getElementById('room-capacity'),
    currentRoomID: document.getElementById('current-room-id'),
    playersList: document.getElementById('players-list'),
    playerCount: document.getElementById('player-count'),
    maxPlayers: document.getElementById('max-players'),
    readyBtn: document.getElementById('ready-btn'),
    copyRoomBtn: document.getElementById('copy-room-id'),

    instructionsContent: document.getElementById('instructions-content'),
    ruleTimer: document.getElementById('rule-timer'),
    startGameBtn: document.getElementById('start-game-btn'),
    clientWaitMsg: document.getElementById('client-wait-msg'),

    gamePlayersStatus: document.getElementById('game-players-status'),
    timer: document.getElementById('timer'),
    roundInfo: document.getElementById('game-round-info'),
    numberGrid: document.getElementById('number-grid'),
    submitBtn: document.getElementById('submit-number-btn'),

    winnerText: document.getElementById('winner-text'),
    averageVal: document.getElementById('average-val'),
    targetVal: document.getElementById('target-val'),
    specialRuleTriggered: document.getElementById('special-rule-triggered'),
    resultsList: document.getElementById('players-results-list'),
    nextRoundBtn: document.getElementById('next-round-btn')
};

// --- INITIALIZATION ---
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) UI.roomIDInput.value = roomFromUrl;

    UI.createRoomBtn.addEventListener('click', createRoom);
    UI.joinRoomBtn.addEventListener('click', joinRoom);
    UI.readyBtn.addEventListener('click', setReady);
    UI.submitBtn.addEventListener('click', submitChoice);
    UI.nextRoundBtn.addEventListener('click', handleNextRoundRequest);
    UI.copyRoomBtn.addEventListener('click', copyInviteLink);

    UI.startGameBtn.addEventListener('click', () => {
        if (state.isHost) {
            clearInterval(state.instructionTimerInterval); // Stop the timer
            state.currentState = GameState.PLAYING;
            broadcast({ type: 'START_GAME' });
            switchScreen(GameState.PLAYING);
        }
    });

    UI.roomCapacity.addEventListener('change', (e) => {
        state.maxPlayers = parseInt(e.target.value);
        UI.maxPlayers.textContent = state.maxPlayers.toString();
        if (state.isHost) syncState();
    });

    createNumberGrid();
}

function createNumberGrid() {
    UI.numberGrid.innerHTML = '';
    for (let i = 0; i <= 100; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = i.toString();
        btn.onclick = () => selectNumber(i, btn);
        UI.numberGrid.appendChild(btn);
    }
}

function selectNumber(num, btn) {
    if (UI.submitBtn.disabled) return;
    state.me.choice = num;
    document.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

// --- PEERJS LOGIC ---

function createRoom() {
    const name = UI.playerName.value.trim();
    if (!name) return alert('Ingresa tu nombre');
    state.me.name = name;
    state.me.score = 0;
    state.isHost = true;
    peer = new Peer(generateID());
    peer.on('open', (id) => {
        state.roomID = id;
        state.me.id = id;
        state.players = [state.me];
        setupLobbyUI();
        UI.hostSettings.classList.remove('hidden');
    });
    peer.on('connection', (conn) => {
        conn.on('open', () => {
            clientConns[conn.peer] = conn;
            conn.on('data', (data) => handleData(data, conn.peer));
            conn.on('close', () => handleDisconnect(conn.peer));
            syncState();
        });
    });
    peer.on('error', (err) => { alert('Error: ' + err.type); location.reload(); });
}

function joinRoom() {
    const name = UI.playerName.value.trim();
    const targetID = UI.roomIDInput.value.trim().toUpperCase();
    if (!name || !targetID) return alert('Nombre e ID requeridos');
    state.me.name = name;
    state.isHost = false;
    state.roomID = targetID;
    peer = new Peer(generateID());
    peer.on('open', (id) => {
        state.me.id = id;
        hostConn = peer.connect(targetID, { reliable: true });
        hostConn.on('open', () => {
            sendToHost({ type: 'JOIN_REQUEST', name: name });
            setupLobbyUI();
        });
        hostConn.on('data', (data) => handleData(data));
        hostConn.on('close', () => { alert('Conexión perdida'); location.reload(); });
    });
    peer.on('error', () => { alert('Sala no encontrada'); location.reload(); });
}

function handleData(data, fromPeerId) {
    if (state.isHost) {
        switch (data.type) {
            case 'JOIN_REQUEST':
                if (state.players.length >= state.maxPlayers) {
                    clientConns[fromPeerId].send({ type: 'ERROR', message: 'SALA LLENA' });
                    return;
                }
                const newPlayer = { id: fromPeerId, name: data.name, score: 0, choice: null, ready: false, isEliminated: false };
                state.players.push(newPlayer);
                syncState();
                break;
            case 'READY_TOGGLE':
                const p = state.players.find(p => p.id === fromPeerId);
                if (p) p.ready = data.ready;
                syncState();
                break;
            case 'SUBMIT_CHOICE':
                const pChoice = state.players.find(p => p.id === fromPeerId);
                if (pChoice) pChoice.choice = data.choice;
                checkAllChoicesIn();
                syncState();
                break;
            case 'NEXT_ROUND_READY':
                const pNext = state.players.find(p => p.id === fromPeerId);
                if (pNext) pNext.ready = true;
                if (state.players.every(p => p.ready || p.isEliminated)) startNextRound();
                break;
        }
    } else {
        switch (data.type) {
            case 'SYNC_STATE':
                const oldState = state.currentState;
                state.players = data.state.players;
                state.round = data.state.round;
                state.maxPlayers = data.state.maxPlayers;
                state.currentState = data.state.currentState;
                state.instructionTimer = data.state.instructionTimer;

                updateUI();
                if (state.currentState !== oldState) {
                    switchScreen(state.currentState);
                }
                break;
            case 'START_GAME':
                switchScreen(GameState.PLAYING);
                break;
            case 'SYNC_RESULTS':
                state.players = data.players;
                displayResultsUI(data.results);
                break;
            case 'START_NEXT_ROUND':
                startNextRound();
                break;
            case 'ERROR':
                alert(data.message);
                location.reload();
                break;
        }
    }
}

function syncState() {
    if (!state.isHost) return;
    updateUI();
    broadcast({ type: 'SYNC_STATE', state: {
            players: state.players,
            round: state.round,
            maxPlayers: state.maxPlayers,
            currentState: state.currentState,
            instructionTimer: state.instructionTimer
        }});
}

function broadcast(data) {
    Object.values(clientConns).forEach(conn => { if (conn && conn.open) conn.send(data); });
}

function sendToHost(data) { if (hostConn && hostConn.open) hostConn.send(data); }

function handleDisconnect(peerId) {
    state.players = state.players.filter(p => p.id !== peerId);
    delete clientConns[peerId];
    syncState();
}

// --- UI FLOW ---

function setupLobbyUI() {
    document.querySelector('.input-group').classList.add('hidden');
    document.getElementById('lobby-status').classList.remove('hidden');
    UI.currentRoomID.textContent = state.roomID;
    updateUI();
}

function setReady() {
    state.me.ready = !state.me.ready;
    UI.readyBtn.textContent = state.me.ready ? 'LISTO ✓' : 'ESTOY LISTO';
    UI.readyBtn.classList.toggle('btn-primary', state.me.ready);
    UI.readyBtn.classList.toggle('btn-secondary', !state.me.ready);

    if (state.isHost) {
        const p = state.players.find(p => p.id === state.me.id);
        if (p) p.ready = state.me.ready;
        syncState();
    } else {
        sendToHost({ type: 'READY_TOGGLE', ready: state.me.ready });
    }
}

function updateUI() {
    UI.playerCount.textContent = state.players.length.toString();
    UI.maxPlayers.textContent = state.maxPlayers.toString();

    UI.playersList.innerHTML = state.players.map(p => `
        <div class="player-card ${p.ready ? 'ready' : ''}">
            <span class="status-dot"></span>
            <strong>${p.name} ${p.id === state.me.id ? '(Tú)' : ''}</strong>
        </div>
    `).join('');

    if (state.players.length >= 2) UI.readyBtn.classList.remove('hidden');
    else UI.readyBtn.classList.add('hidden');

    if (state.isHost && state.players.length >= 2 && state.players.every(p => p.ready)) {
        if (state.currentState === GameState.LOBBY) {
            state.currentState = GameState.INSTRUCTIONS;
            state.ruleChanged = true;
            syncState();
            switchScreen(GameState.INSTRUCTIONS);
        }
    }

    // Control visibility and enabled state of startGameBtn
    UI.startGameBtn.style.display = state.isHost ? 'block' : 'none';
    UI.clientWaitMsg.classList.toggle('hidden', state.isHost);

    UI.gamePlayersStatus.innerHTML = state.players.map(p => `
        <div class="player-status-card ${p.isEliminated ? 'eliminated' : ''}">
            <div style="font-weight: bold; font-size: 0.8rem;">${p.name}</div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">PUNTOS: ${p.score}</div>
            <div class="life-bar-container">
                <div class="life-bar ${p.score <= -7 ? 'low' : ''}" style="width: ${Math.max(0, (10 + p.score) * 10)}%"></div>
            </div>
            ${p.isEliminated ? '<div style="color: var(--primary); font-size: 0.6rem; margin-top: 4px;">DEAD</div>' : ''}
        </div>
    `).join('');
}

function getRulesHTML() {
    const aliveCount = state.players.filter(p => !p.isEliminated).length;
    let html = `
        <h3>REGLAS DEL JUEGO</h3>
        <ul>
            <li><strong>REGLA BÁSICA:</strong> Cada jugador elige un número del 0 al 100. Se calcula el promedio de todos los números y se multiplica por 0.8. El jugador cuyo número esté más cerca de ese resultado gana la ronda. Los demás pierden 1 punto de vida.</li>
            <li><strong>VIDAS:</strong> Todos empiezan con 10 puntos de vida. Al llegar a 0 (score = -10), el Agua Regia se derrama y el jugador es eliminado.</li>
        </ul>
    `;

    // Regla de Invalidez (Activa con 4 o menos jugadores)
    if (aliveCount <= 4) {
        html += `
            <div style="border: 1px dashed var(--primary); padding: 10px; margin: 10px 0;">
                <h3 style="color: var(--primary); margin-top: 0;">⚠️ REGLA DE INVALIDEZ (Activa con 4 o menos jugadores)</h3>
                <p>Si dos o más jugadores eligen el mismo número, ese número queda INVALIDADO. Los jugadores que lo eligieron pierden 1 punto aunque el número estuviera cerca del objetivo.</p>
            </div>
        `;
    }
    // Acierto Exacto (Activa con 3 o menos jugadores)
    if (aliveCount <= 3) {
        html += `
            <div style="border: 1px dashed var(--primary); padding: 10px; margin: 10px 0;">
                <h3 style="color: var(--primary); margin-top: 0;">⚠️ ACIERTO EXACTO (Activa con 3 o menos jugadores)</h3>
                <p>Si el ganador acierta el número objetivo exactamente, todos los demás pierden 2 puntos en lugar de 1.</p>
                <hr style="border: 0; border-top: 1px solid #444;">
                <p style="font-size: 0.8rem; color: #aaa;">
                    <strong>Estrategia de Daimon:</strong> Con la regla de invalidez, la batalla es a tres bandas entre 0, 1 y 2-100. 
                    Si todos eligen 1, el único movimiento ganador sería elegir cualquier valor que no sea 1.
                </p>
            </div>
        `;
    }
    // Duelo Final (Activa con 2 jugadores)
    if (aliveCount <= 2) {
        html += `
            <div style="border: 1px dashed var(--primary); padding: 10px; margin: 10px 0;">
                <h3 style="color: var(--primary); margin-top: 0;">⚠️ DUELO FINAL (Activa con 2 jugadores) — Piedra, Papel o Tijera</h3>
                <p>0 vence a 1 · 1 vence a 100 · 100 vence a 0. Elige con sabiduría.</p>
            </div>
        `;
    }
    return html;
}

function startInstructionTimer() {
    clearInterval(state.instructionTimerInterval);
    if (!state.ruleChanged) {
        UI.ruleTimer.classList.add('hidden');
        return;
    }

    state.instructionTimer = 300; // 5 minutes
    UI.ruleTimer.classList.remove('hidden');

    state.instructionTimerInterval = setInterval(() => {
        state.instructionTimer--;
        const mins = Math.floor(state.instructionTimer / 60);
        const secs = state.instructionTimer % 60;
        UI.ruleTimer.textContent = `⏱ NUEVA REGLA — ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (state.instructionTimer <= 0) {
            clearInterval(state.instructionTimerInterval);
            if (state.isHost) {
                state.currentState = GameState.PLAYING;
                broadcast({ type: 'START_GAME' });
                switchScreen(GameState.PLAYING);
            }
        }
    }, 1000);
}

function startTimer() {
    state.timer = 30;
    UI.timer.textContent = state.timer.toString();
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timer--;
        UI.timer.textContent = state.timer.toString();
        if (state.timer <= 0) {
            clearInterval(state.timerInterval);
            if (state.me.choice === null && !state.me.isEliminated) {
                state.me.choice = Math.floor(Math.random() * 101);
                submitChoice();
            }
        }
    }, 1000);
}

function submitChoice() {
    if (state.me.choice === null) return alert('Selecciona un número del tablero');
    UI.submitBtn.disabled = true;
    document.querySelectorAll('.number-btn').forEach(b => b.classList.add('disabled'));
    UI.submitBtn.textContent = '✓';
    document.getElementById('waiting-opponent-game').classList.remove('hidden');
    if (state.isHost) {
        const p = state.players.find(p => p.id === state.me.id);
        if (p) p.choice = state.me.choice;
        checkAllChoicesIn();
    } else { sendToHost({ type: 'SUBMIT_CHOICE', choice: state.me.choice }); }
}

function checkAllChoicesIn() {
    const activePlayers = state.players.filter(p => !p.isEliminated);
    if (activePlayers.every(p => p.choice !== null)) calculateRound();
}

function calculateRound() {
    if (!state.isHost) return;
    const activePlayers = state.players.filter(p => !p.isEliminated);
    const aliveCount = activePlayers.length;
    const choices = activePlayers.map(p => p.choice);
    const avg = choices.reduce((a, b) => a + b, 0) / choices.length;
    const target = avg * 0.8;

    let specialTrigger = "";
    let invalidPeers = new Set();

    if (aliveCount <= 4) {
        const counts = {}; activePlayers.forEach(p => counts[p.choice] = (counts[p.choice] || 0) + 1);
        activePlayers.forEach(p => { if (counts[p.choice] > 1) invalidPeers.add(p.id); });
    }

    let results = activePlayers.map(p => ({
        id: p.id, name: p.name, choice: p.choice,
        diff: invalidPeers.has(p.id) ? 9999 : Math.abs(p.choice - target),
        isInvalid: invalidPeers.has(p.id)
    }));

    if (aliveCount === 2) {
        const p1 = results[0]; const p2 = results[1];
        if ((p1.choice === 0 && p2.choice === 100) || (p1.choice === 100 && p2.choice === 0)) {
            const winner = p1.choice === 100 ? p1 : p2; const loser = p1.choice === 0 ? p1 : p2;
            winner.diff = 0; loser.diff = 9999; specialTrigger = "¡100 vence a 0!";
        } else if ((p1.choice === 1 && p2.choice === 0) || (p1.choice === 0 && p2.choice === 1)) {
            const winner = p1.choice === 0 ? p1 : p2; const loser = p1.choice === 1 ? p1 : p2;
            winner.diff = 0; loser.diff = 9999; specialTrigger = "¡0 vence a 1!";
        } else if ((p1.choice === 100 && p2.choice === 1) || (p1.choice === 1 && p2.choice === 100)) {
            const winner = p1.choice === 1 ? p1 : p2; const loser = p1.choice === 100 ? p1 : p2;
            winner.diff = 0; loser.diff = 9999; specialTrigger = "¡1 vence a 100!";
        }
    }

    results.sort((a, b) => a.diff - b.diff);
    const roundWinner = results[0];
    const isExactMatch = aliveCount <= 3 && Math.abs(roundWinner.choice - target) < 0.0001;

    state.players.forEach(p => {
        if (p.isEliminated) return;
        const res = results.find(r => r.id === p.id);
        if (p.id === roundWinner.id && !res.isInvalid && res.diff < 9999) {
            // Winner
        } else {
            p.score -= isExactMatch ? 2 : 1;
        }
        if (p.score <= -10) {
            p.isEliminated = true;
            state.ruleChanged = true;
        }
    });

    if (isExactMatch) specialTrigger = "¡ACIERTO EXACTO!";
    else if (invalidPeers.size > 0) specialTrigger = "¡DUPLICADOS INVALIDADOS!";

    const remainingAlive = state.players.filter(p => !p.isEliminated).length;
    const finalResults = { average: avg, target: target, specialTrigger: specialTrigger, sortedResults: results, gameFinished: remainingAlive <= 1 };

    state.currentState = GameState.RESULTS;
    broadcast({ type: 'SYNC_RESULTS', results: finalResults, players: state.players });
    displayResultsUI(finalResults);
    state.players.forEach(p => p.ready = false);
}

function displayResultsUI(res) {
    switchScreen(GameState.RESULTS);
    UI.averageVal.textContent = res.average.toFixed(2);
    UI.targetVal.textContent = res.target.toFixed(2);
    UI.specialRuleTriggered.textContent = res.specialTrigger;
    UI.resultsList.innerHTML = res.sortedResults.map((r, i) => `
        <div class="metric ${r.isInvalid ? 'eliminated' : ''}">
            <span>${i === 0 && !r.isInvalid && r.diff < 9999 ? '🏆' : '❌'} ${r.name}</span>
            <span class="value">${r.choice} ${r.isInvalid ? '(INV)' : `(D:${r.diff.toFixed(1)})`}</span>
        </div>
    `).join('');

    if (res.gameFinished) {
        const survivor = state.players.find(p => !p.isEliminated);
        UI.winnerText.textContent = survivor ? `¡${survivor.name} SOBREVIVIÓ!` : "GAME OVER";
        UI.nextRoundBtn.textContent = "NUEVA PARTIDA"; UI.nextRoundBtn.onclick = () => location.reload();
    } else {
        UI.nextRoundBtn.textContent = "SIGUIENTE"; UI.nextRoundBtn.onclick = handleNextRoundRequest;
    }
}

function handleNextRoundRequest() {
    UI.nextRoundBtn.disabled = true; UI.nextRoundBtn.textContent = '...';
    if (state.isHost) {
        state.players.find(p => p.id === state.me.id).ready = true;
        if (state.players.every(p => p.ready || p.isEliminated)) startNextRound();
    } else { sendToHost({ type: 'NEXT_ROUND_READY' }); }
}

function startNextRound() {
    state.round++;
    state.players.forEach(p => { p.choice = null; p.ready = false; });
    state.me.choice = null; UI.submitBtn.disabled = false; UI.submitBtn.textContent = 'CONFIRMAR ELECCIÓN';
    document.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected', 'disabled'));
    document.getElementById('waiting-opponent-game').classList.add('hidden');
    UI.nextRoundBtn.disabled = false; UI.nextRoundBtn.textContent = 'SIGUIENTE';

    if (state.isHost) {
        if (state.ruleChanged) {
            state.currentState = GameState.INSTRUCTIONS;
            syncState();
            switchScreen(GameState.INSTRUCTIONS);
        } else {
            state.currentState = GameState.PLAYING;
            syncState();
            broadcast({ type: 'START_NEXT_ROUND' });
            switchScreen(GameState.PLAYING);
        }
    }
}

function switchScreen(target) {
    const screenKey = ScreenMap[target];
    Object.values(UI.screens).forEach(s => s.classList.remove('active'));
    if (UI.screens[screenKey]) {
        UI.screens[screenKey].classList.add('active');
    }

    if (target === GameState.PLAYING) {
        UI.roundInfo.textContent = `RONDA ${state.round}`;
        state.ruleChanged = false;
        updateUI();
        startTimer();
    } else if (target === GameState.INSTRUCTIONS) {
        UI.instructionsContent.innerHTML = getRulesHTML();
        startInstructionTimer();
    }
}

function generateID() {
    return 'KOD-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function copyInviteLink() {
    const url = window.location.origin + window.location.pathname + '?room=' + state.roomID;
    navigator.clipboard.writeText(url).then(() => {
        const oldText = UI.copyRoomBtn.querySelector('small').textContent;
        UI.copyRoomBtn.querySelector('small').textContent = '¡Copiado!';
        setTimeout(() => UI.copyRoomBtn.querySelector('small').textContent = oldText, 2000);
    });
}

init();