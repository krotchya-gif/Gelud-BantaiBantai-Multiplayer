import { afterEach, describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../../server/index.js';
import { SERVER_EVENTS } from '../../shared/protocol/events.js';
import { PROTOCOL_VERSION } from '../../shared/protocol/version.js';

const apps = [];
const clients = [];

class TestClient {
  constructor(url) {
    this.events = new EventEmitter();
    this.pendingAcks = new Map();
    this.nextRequestId = 0;
    this.socket = new WebSocket(`${url}/ws`);
    this.socket.on('open', () => this.events.emit('connect'));
    this.socket.on('message', (raw) => {
      const frame = JSON.parse(raw.toString());
      if (frame.type === 'ack') {
        const ack = this.pendingAcks.get(frame.requestId);
        this.pendingAcks.delete(frame.requestId);
        ack?.(frame.payload);
        return;
      }
      this.events.emit(frame.event, frame.payload);
    });
    this.socket.on('close', (code, reason) => this.events.emit('disconnect', reason?.toString() || `closed:${code}`));
  }

  on(event, handler) { this.events.on(event, handler); return this; }
  once(event, handler) { this.events.once(event, handler); return this; }

  emit(event, payload = {}, ack) {
    if (typeof payload === 'function') {
      ack = payload;
      payload = {};
    }
    const frame = { type: 'event', event, payload };
    if (typeof ack === 'function') {
      frame.requestId = `test_${++this.nextRequestId}`;
      this.pendingAcks.set(frame.requestId, ack);
    }
    this.socket.send(JSON.stringify(frame));
  }

  disconnect() { this.socket.close(); }
}

function once(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 3000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function makeClient(port, name) {
  const socket = new TestClient(`ws://127.0.0.1:${port}`);
  clients.push(socket);
  await once(socket, 'connect');
  socket.emit('session:hello', { protocolVersion: PROTOCOL_VERSION, name });
  await once(socket, SERVER_EVENTS.sessionAccepted);
  return socket;
}

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  for (const app of apps.splice(0)) {
    clearInterval(app.cleanupTimer);
    app.socketServer.close();
    await new Promise((resolve) => app.httpServer.close(resolve));
  }
});

describe('multiplayer lobby', () => {
  it('creates, joins, updates, and transfers a room host', async () => {
    const app = createGameServer({
      config: {
        gameOrigin: '*',
        maxPlayersPerRoom: 8,
        roomIdleTtlSeconds: 60,
        logLevel: 'silent',
      },
      logger: { info() {}, error() {}, warn() {} },
    });
    apps.push(app);
    await new Promise((resolve) => app.httpServer.listen(0, '127.0.0.1', resolve));
    const port = app.httpServer.address().port;
    const first = await makeClient(port, 'Host');
    first.emit('room:create', { mode: 'deathmatch', mapId: 'open', maxPlayers: 2 });
    const joined = await once(first, SERVER_EVENTS.roomJoined);
    const code = joined.room.code;
    const second = await makeClient(port, 'Guest');
    second.emit('room:join', { code });
    const state = await once(first, SERVER_EVENTS.roomState);
    expect(state.players).toHaveLength(2);
    expect(state.hostPlayerId).toBe(joined.playerId);

    second.emit('room:leave');
    const afterLeave = await once(first, SERVER_EVENTS.roomState);
    expect(afterLeave.players).toHaveLength(1);
    first.emit('room:leave');
  });

  it('starts an authoritative movement runner and acknowledges input', async () => {
    const app = createGameServer({
      config: { gameOrigin: '*', maxPlayersPerRoom: 8, roomIdleTtlSeconds: 60, logLevel: 'silent' },
      logger: { info() {}, error() {}, warn() {} },
    });
    apps.push(app);
    await new Promise((resolve) => app.httpServer.listen(0, '127.0.0.1', resolve));
    const port = app.httpServer.address().port;
    const first = await makeClient(port, 'Host');
    first.emit('room:create', {});
    const created = await once(first, SERVER_EVENTS.roomJoined);
    const second = await makeClient(port, 'Guest');
    second.emit('room:join', { code: created.room.code });
    await once(first, SERVER_EVENTS.roomState);
    const initPromise = once(first, SERVER_EVENTS.matchInit);
    first.emit('lobby:start');
    const init = await initPromise;
    expect(init.tickRate).toBe(30);
    const snapshotPromise = once(first, SERVER_EVENTS.matchSnapshot);
    first.emit('input:move', { seq: 1, moveX: 1, moveZ: 0, aimX: 1, aimZ: 0 });
    const snapshot = await snapshotPromise;
    const local = snapshot.players.find((player) => player.id === init.players[0].id);
    expect(snapshot.tick).toBeGreaterThan(0);
    expect(local).toBeTruthy();
    const combatEventPromise = once(first, SERVER_EVENTS.matchEvent);
    first.emit('action:attack-start', { actionId: 1, aimX: 1, aimZ: 0 });
    const combatEvent = await combatEventPromise;
    expect(['PROJECTILE_SPAWN', 'DAMAGE', 'DEATH']).toContain(combatEvent.type);
  });

  it('clears room membership when leaving from a running match', async () => {
    const app = createGameServer({
      config: { gameOrigin: '*', maxPlayersPerRoom: 8, roomIdleTtlSeconds: 60, logLevel: 'silent' },
      logger: { info() {}, error() {}, warn() {} },
    });
    apps.push(app);
    await new Promise((resolve) => app.httpServer.listen(0, '127.0.0.1', resolve));
    const port = app.httpServer.address().port;
    const first = await makeClient(port, 'Host');
    first.emit('room:create', {});
    const created = await once(first, SERVER_EVENTS.roomJoined);
    const second = await makeClient(port, 'Guest');
    second.emit('room:join', { code: created.room.code });
    await once(first, SERVER_EVENTS.roomState);
    const initPromise = once(first, SERVER_EVENTS.matchInit);
    first.emit('lobby:start');
    await initPromise;

    const left = await new Promise((resolve) => first.emit('match:leave', resolve));
    const session = [...app.socketServer.registry.sessionsById.values()].find((item) => item.name === 'Host');
    const room = app.roomManager.findByCode(created.room.code);
    expect(left.ok).toBe(true);
    expect(session.roomId).toBeNull();
    expect(room.players.has(session.playerId)).toBe(false);
  });

  it('recovers the same lobby session during the grace period', async () => {
    const app = createGameServer({
      config: { gameOrigin: '*', reconnectGraceSeconds: 2, logLevel: 'silent' },
      logger: { info() {}, error() {}, warn() {} },
    });
    apps.push(app);
    await new Promise((resolve) => app.httpServer.listen(0, '127.0.0.1', resolve));
    const port = app.httpServer.address().port;
    const first = await makeClient(port, 'Reconnecter');
    first.emit('room:create', {});
    const created = await once(first, SERVER_EVENTS.roomJoined);
    expect(created.room.players).toHaveLength(1);
    first.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    // Read the stable credentials from the server registry in this integration test only.
    const session = [...app.socketServer.registry.sessionsById.values()][0];
    const second = new TestClient(`ws://127.0.0.1:${port}`);
    clients.push(second);
    await once(second, 'connect');
    const recoveredPromise = once(second, SERVER_EVENTS.sessionRecovered);
    second.emit('session:hello', { protocolVersion: PROTOCOL_VERSION, sessionId: session.sessionId, reconnectToken: session.reconnectToken, name: 'Reconnecter' });
    const recovered = await recoveredPromise;
    expect(recovered.room.id).toBe(created.room.id);
    expect(recovered.room.players[0].connected).toBe(true);
  });
});
