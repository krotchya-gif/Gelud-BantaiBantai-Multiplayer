import { NetworkClient } from './NetworkClient.js';
import { NetworkGameSession } from './NetworkGameSession.js';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/protocol/events.js';

const byId = (id) => document.getElementById(id);
const menu = byId('menu');
const screen = byId('multiplayer');
const startPanel = byId('multiplayer-start');
const roomPanel = byId('multiplayer-room');
const status = byId('multiplayer-status');
const roomCode = byId('room-code-value');
const roomCodeInput = byId('room-code-input');
const playerList = byId('room-player-list');
const modeInput = byId('room-mode');
const mapInput = byId('room-map');
const characterInput = byId('room-character');
const startButton = byId('room-start');
const readyButton = byId('room-ready');

let client;
let currentRoom;
let localPlayerId;
let connected = false;
let networkSession;

function ensureClient() {
  if (client) return client;
  const savedName = localStorage.getItem('gbh-player-name') || 'Player';
  client = new NetworkClient({ name: savedName });
  networkSession = new NetworkGameSession(client);
  window.__GBH_NETWORK_SESSION__ = networkSession;
  client.addEventListener(SERVER_EVENTS.sessionAccepted, ({ detail }) => {
    connected = true;
    localPlayerId = detail.playerId;
    status.textContent = 'Terhubung. Buat room atau masukkan kode room.';
  });
  client.addEventListener('connect_error', () => {
    connected = false;
    status.textContent = 'Server sedang tidak tersedia.';
  });
  client.addEventListener(SERVER_EVENTS.roomJoined, ({ detail }) => {
    currentRoom = detail.room;
    renderRoom();
    status.textContent = 'Room dibuat. Bagikan kode ini ke pemain lain.';
  });
  client.addEventListener(SERVER_EVENTS.roomState, ({ detail }) => {
    currentRoom = detail;
    renderRoom();
  });
  client.addEventListener(SERVER_EVENTS.roomError, ({ detail }) => {
    status.textContent = detail.message || 'Room gagal diproses.';
  });
  client.addEventListener(SERVER_EVENTS.matchInit, () => {
    status.textContent = 'Match tersambung. Menyiapkan arena...';
  });
  client.addEventListener(SERVER_EVENTS.matchInit, ({ detail }) => {
    screen?.classList.remove('open');
    if (window.__game?.startNetworkMatch) window.__game.startNetworkMatch(networkSession, detail);
    else window.__GBH_PENDING_NETWORK_MATCH__ = { session: networkSession, init: detail };
  });
  client.addEventListener(SERVER_EVENTS.sessionRecovered, ({ detail }) => {
    connected = true;
    currentRoom = detail.room || currentRoom;
    renderRoom();
    status.textContent = 'Sesi tersambung kembali.';
  });
  client.addEventListener(SERVER_EVENTS.matchEnd, ({ detail }) => {
    status.textContent = detail?.winnerId === localPlayerId ? 'Kamu memenangkan match.' : 'Match selesai. Host dapat memulai rematch.';
  });
  client.addEventListener('disconnect', () => {
    connected = false;
    status.textContent = 'Koneksi terputus. Mencoba menyambungkan kembali...';
  });
  client.connect();
  return client;
}

function openLobby() {
  menu?.classList.remove('open');
  screen?.classList.add('open');
  ensureClient();
}

function closeLobby() {
  screen?.classList.remove('open');
  menu?.classList.add('open');
  if (currentRoom) client?.emit(CLIENT_EVENTS.roomLeave);
  currentRoom = null;
  startPanel.hidden = false;
  roomPanel.hidden = true;
}

function renderRoom() {
  if (!currentRoom) return;
  startPanel.hidden = true;
  roomPanel.hidden = false;
  roomCode.textContent = currentRoom.code;
  modeInput.value = currentRoom.settings.mode;
  mapInput.value = currentRoom.settings.mapId;
  playerList.replaceChildren();
  for (const player of currentRoom.players) {
    const row = document.createElement('div');
    row.className = 'room-player';
    const name = document.createElement('strong');
    name.textContent = player.name;
    const details = document.createElement('span');
    details.textContent = `${player.characterId.toUpperCase()} · ${player.ready ? 'READY' : 'NOT READY'}${player.id === currentRoom.hostPlayerId ? ' · HOST' : ''}`;
    row.append(name, details);
    playerList.append(row);
  }
  const local = currentRoom.players.find((player) => player.id === localPlayerId);
  characterInput.value = local?.characterId || 'dusty';
  readyButton.textContent = local?.ready ? 'CANCEL READY' : 'READY';
  startButton.hidden = currentRoom.hostPlayerId !== localPlayerId;
  modeInput.disabled = currentRoom.hostPlayerId !== localPlayerId;
  mapInput.disabled = currentRoom.hostPlayerId !== localPlayerId;
}

byId('open-multiplayer')?.addEventListener('click', openLobby);
byId('close-multiplayer')?.addEventListener('click', closeLobby);
byId('create-room')?.addEventListener('click', () => {
  if (!connected) return (status.textContent = 'Belum terhubung ke server.');
  client.emit(CLIENT_EVENTS.roomCreate, { mode: 'deathmatch', mapId: 'open', maxPlayers: 8 });
});
byId('join-room')?.addEventListener('click', () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (code.length < 4) return (status.textContent = 'Masukkan kode room yang valid.');
  client.emit(CLIENT_EVENTS.roomJoin, { code });
});
readyButton?.addEventListener('click', () => {
  const local = currentRoom?.players.find((player) => player.id === localPlayerId);
  client?.emit(CLIENT_EVENTS.lobbyReady, { ready: !local?.ready });
});
modeInput?.addEventListener('change', () => client?.emit(CLIENT_EVENTS.lobbyUpdateSettings, { mode: modeInput.value }));
mapInput?.addEventListener('change', () => client?.emit(CLIENT_EVENTS.lobbyUpdateSettings, { mapId: mapInput.value.trim() || 'open' }));
characterInput?.addEventListener('change', () => client?.emit(CLIENT_EVENTS.lobbySelectCharacter, { characterId: characterInput.value }));
startButton?.addEventListener('click', () => client?.emit(CLIENT_EVENTS.lobbyStart));
byId('copy-room-code')?.addEventListener('click', async () => {
  if (!currentRoom?.code) return;
  try { await navigator.clipboard.writeText(currentRoom.code); status.textContent = 'Kode room disalin.'; }
  catch { status.textContent = `Kode room: ${currentRoom.code}`; }
});
