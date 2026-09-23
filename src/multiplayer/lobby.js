import { NetworkClient } from './NetworkClient.js';
import { NetworkGameSession } from './NetworkGameSession.js';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/protocol/events.js';
import { MAP_DEFINITIONS } from '../../shared/maps/MapDefinitions.js';
import { getCharacterDef } from '../../shared/data/characters.js';

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
const createMapInput = byId('room-create-map');
const characterInput = byId('room-character');
const startButton = byId('room-start');
const readyButton = byId('room-ready');

let client;
let currentRoom;
let localPlayerId;
let connected = false;
let networkSession;

function populateMapSelect(select) {
  if (!select) return;
  select.replaceChildren();
  for (const [id, map] of Object.entries(MAP_DEFINITIONS)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = map.label;
    select.append(option);
  }
}

populateMapSelect(mapInput);
populateMapSelect(createMapInput);
for (const option of characterInput?.options || []) option.textContent = getCharacterDef(option.value).name;

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
    client.roomLeaveRequested = false;
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
    if (client.roomLeaveRequested) return;
    status.textContent = 'Match tersambung. Menyiapkan arena...';
  });
  client.addEventListener(SERVER_EVENTS.matchInit, ({ detail }) => {
    if (client.roomLeaveRequested) return;
    screen?.classList.remove('open');
    if (window.__game?.startNetworkMatch) window.__game.startNetworkMatch(networkSession, detail);
    else window.__GBH_PENDING_NETWORK_MATCH__ = { session: networkSession, init: detail };
  });
  client.addEventListener(SERVER_EVENTS.sessionRecovered, ({ detail }) => {
    if (client.roomLeaveRequested) {
      client.leaveRoom();
      return;
    }
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
  client.addEventListener('room-left', ({ detail }) => {
    if (detail?.ok === false) {
      status.textContent = 'Permintaan keluar room belum dikonfirmasi server.';
      return;
    }
    currentRoom = null;
    startPanel.hidden = false;
    roomPanel.hidden = true;
    status.textContent = 'Tidak berada di room. Pilih map untuk membuat room.';
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
  if (currentRoom) client?.leaveRoom();
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
  const mapId = Object.hasOwn(MAP_DEFINITIONS, currentRoom.settings.mapId) ? currentRoom.settings.mapId : 'open';
  mapInput.value = mapId;
  if (createMapInput) createMapInput.value = mapId;
  playerList.replaceChildren();
  for (const player of currentRoom.players) {
    const row = document.createElement('div');
    row.className = 'room-player';
    const name = document.createElement('strong');
    name.textContent = player.name;
    const details = document.createElement('span');
    const characterName = player.characterName || getCharacterDef(player.characterId).name;
    details.textContent = `${characterName} · ${player.ready ? 'READY' : 'NOT READY'}${player.id === currentRoom.hostPlayerId ? ' · HOST' : ''}`;
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
  client.roomLeaveRequested = false;
  client.emit(CLIENT_EVENTS.roomCreate, { mode: 'deathmatch', mapId: createMapInput?.value || 'open', maxPlayers: 8 });
});
byId('join-room')?.addEventListener('click', () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (code.length < 4) return (status.textContent = 'Masukkan kode room yang valid.');
  client.roomLeaveRequested = false;
  client.emit(CLIENT_EVENTS.roomJoin, { code });
});
readyButton?.addEventListener('click', () => {
  const local = currentRoom?.players.find((player) => player.id === localPlayerId);
  client?.emit(CLIENT_EVENTS.lobbyReady, { ready: !local?.ready });
});
modeInput?.addEventListener('change', () => client?.emit(CLIENT_EVENTS.lobbyUpdateSettings, { mode: modeInput.value }));
mapInput?.addEventListener('change', () => client?.emit(CLIENT_EVENTS.lobbyUpdateSettings, { mapId: mapInput.value || 'open' }));
characterInput?.addEventListener('change', () => client?.emit(CLIENT_EVENTS.lobbySelectCharacter, { characterId: characterInput.value }));
startButton?.addEventListener('click', () => client?.emit(CLIENT_EVENTS.lobbyStart));
byId('copy-room-code')?.addEventListener('click', async () => {
  if (!currentRoom?.code) return;
  try { await navigator.clipboard.writeText(currentRoom.code); status.textContent = 'Kode room disalin.'; }
  catch { status.textContent = `Kode room: ${currentRoom.code}`; }
});
