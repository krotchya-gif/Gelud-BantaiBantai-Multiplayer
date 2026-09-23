import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer as NativeWebSocketServer } from 'ws';
import { CLIENT_EVENTS, ROOM_ERRORS, SERVER_EVENTS } from '../../shared/protocol/events.js';
import { PROTOCOL_VERSION } from '../../shared/protocol/version.js';
import {
  attackReleaseSchema,
  attackStartSchema,
  flickerSchema,
  moveInputSchema,
  readySchema,
  roomCreateSchema,
  roomJoinSchema,
  selectCharacterSchema,
  sessionHelloSchema,
  settingsSchema,
  superSchema,
  itemSchema,
} from '../../shared/protocol/schemas.js';
import { ConnectionRegistry } from './ConnectionRegistry.js';
import { validatePayload } from '../security/PayloadValidator.js';
import { RateLimiter } from '../security/RateLimiter.js';
import { sanitizePlayerName } from '../security/NameSanitizer.js';
import { MatchRunner } from '../match/MatchRunner.js';

const ERROR_MESSAGES = Object.freeze({
  ROOM_NOT_FOUND: 'Room tidak ditemukan.',
  ROOM_FULL: 'Room sudah penuh.',
  MATCH_ALREADY_RUNNING: 'Match sudah dimulai.',
  HOST_ONLY: 'Hanya host yang dapat melakukan aksi ini.',
  MINIMUM_PLAYERS_REQUIRED: 'Minimal dua pemain diperlukan.',
  INVALID_ROOM_STATE: 'Room sedang tidak menerima perubahan.',
  NOT_IN_ROOM: 'Kamu belum masuk room.',
  INVALID_CHARACTER: 'Karakter tidak valid.',
  INVALID_MAP: 'Map tidak tersedia.',
  INVALID_ROOM_SETTINGS: 'Pengaturan room tidak valid.',
  PROTOCOL_MISMATCH: 'Versi game berbeda. Muat ulang game.',
});

// The game uses one plain JSON WebSocket connection. Cloudflare Tunnel
// forwards the HTTPS/WSS upgrade to this server on port 3200; there is no
// protocol handshake, polling fallback, or external room adapter here.
export class WebSocketServer {
  constructor(httpServer, { config, roomManager, logger = console } = {}) {
    this.config = config;
    this.roomManager = roomManager;
    this.logger = logger;
    this.registry = new ConnectionRegistry();
    this.startedAt = Date.now();
    this.helloLimiter = new RateLimiter({ limit: 5 });
    this.roomLimiter = new RateLimiter({ limit: 5 });
    this.activeMatches = new Map();
    this.connections = new Map();
    this.allowedOrigins = config.gameOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
    this.wsServer = new NativeWebSocketServer({ noServer: true, maxPayload: 32 * 1024 });
    this.handleUpgrade = (request, networkSocket, head) => {
      const origin = request.headers.origin;
      const pathname = new URL(request.url || '/', 'http://localhost').pathname;
      const originAllowed = !origin || this.allowedOrigins.includes('*') || this.allowedOrigins.includes(origin);
      const pathAllowed = pathname === '/' || pathname === '/ws';
      if (!originAllowed || !pathAllowed) {
        networkSocket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        networkSocket.destroy();
        return;
      }
      this.wsServer.handleUpgrade(request, networkSocket, head, (rawSocket) => {
        this.wsServer.emit('connection', rawSocket, request);
      });
    };
    this.wsServer.on('connection', (rawSocket, request) => this.onConnection(rawSocket, request));
    this.wsServer.on('error', (error) => this.logger.error?.({ err: error }, 'websocket server error'));
    httpServer.on('upgrade', this.handleUpgrade);
  }

  onConnection(rawSocket, request) {
    const socket = this.createConnection(rawSocket, request);
    this.connections.set(socket.id, socket);
    let session = null;
    let greeted = false;
    const requireSession = () => {
      if (session && greeted) return true;
      this.sendError(socket, 'SESSION_REQUIRED', 'Sesi belum diterima.');
      return false;
    };
    const validate = (schema, payload) => validatePayload(socket, schema, payload);

    socket.on(CLIENT_EVENTS.sessionHello, (payload = {}) => {
      if (!this.helloLimiter.allow(socket.handshake.address || socket.id)) return;
      const data = validate(sessionHelloSchema, payload);
      if (!data) return;
      if (data.protocolVersion !== PROTOCOL_VERSION) {
        this.sendError(socket, 'PROTOCOL_MISMATCH', ERROR_MESSAGES.PROTOCOL_MISMATCH);
        socket.disconnect(true);
        return;
      }
      const existing = data.sessionId ? this.registry.bySession(data.sessionId) : null;
      if (existing && existing.socketId && existing.socketId !== socket.id) {
        this.sendError(socket, 'SESSION_IN_USE', 'Sesi masih digunakan koneksi lain.');
        return;
      }
      if (existing && data.reconnectToken !== existing.reconnectToken) {
        this.sendError(socket, 'INVALID_RECONNECT_TOKEN', 'Sesi reconnect tidak valid.');
        return;
      }
      session = existing || this.registry.create(data.name);
      session.name = sanitizePlayerName(data.name || session.name);
      if (session.disconnectTimer) {
        clearTimeout(session.disconnectTimer);
        session.disconnectTimer = null;
      }
      this.registry.bind(session, socket);
      greeted = true;
      this.logger.info?.({ playerId: session.playerId, socketId: socket.id }, 'connection accepted');
      socket.emit(SERVER_EVENTS.sessionAccepted, {
        protocolVersion: PROTOCOL_VERSION,
        sessionId: session.sessionId,
        playerId: session.playerId,
        name: session.name,
        reconnectToken: session.reconnectToken,
      });
      if (session.roomId) {
        const room = this.roomManager.findById(session.roomId);
        if (room?.players.has(session.playerId)) {
          room.players.get(session.playerId).connected = true;
          this.activeMatches.get(room.id)?.setPlayerConnected(session.playerId, true);
          socket.emit(SERVER_EVENTS.sessionRecovered, { room: room.toPublicState() });
          this.activeMatches.get(room.id)?.sendCurrentState(socket);
          this.broadcastRoom(room);
        }
      }
    });

    socket.on(CLIENT_EVENTS.roomCreate, (payload = {}) => {
      if (!requireSession() || !this.roomLimiter.allow(session.playerId)) return;
      const data = validate(roomCreateSchema, payload);
      if (!data) return;
      if (session.roomId) this.leaveCurrentRoom(session);
      const room = this.roomManager.createRoom(session, {
        ...data,
        maxPlayers: Math.min(data.maxPlayers, this.config.maxPlayersPerRoom),
      });
      session.roomId = room.id;
      socket.emit(SERVER_EVENTS.roomJoined, { room: room.toPublicState(), playerId: session.playerId });
      this.broadcastRoom(room);
    });

    socket.on(CLIENT_EVENTS.roomJoin, (payload = {}) => {
      if (!requireSession() || !this.roomLimiter.allow(session.playerId)) return;
      const data = validate(roomJoinSchema, payload);
      if (!data) return;
      const room = this.roomManager.findByCode(data.code);
      if (!room) return this.sendError(socket, ROOM_ERRORS.roomNotFound, ERROR_MESSAGES.ROOM_NOT_FOUND);
      try {
        if (session.roomId) this.leaveCurrentRoom(session);
        room.addPlayer(session);
        session.roomId = room.id;
        socket.emit(SERVER_EVENTS.roomJoined, { room: room.toPublicState(), playerId: session.playerId });
        this.broadcastRoom(room);
        this.logger.info?.({ roomId: room.id, playerId: session.playerId }, 'room join');
      } catch (error) {
        this.sendError(socket, error.message, ERROR_MESSAGES[error.message] || 'Gagal bergabung ke room.');
      }
    });

    const leaveRoom = (payload, ack) => {
      if (!requireSession()) return;
      this.leaveCurrentRoom(session);
      if (typeof ack === 'function') ack({ ok: true });
    };
    socket.on(CLIENT_EVENTS.roomLeave, leaveRoom);
    // Older clients used match:leave from the pause menu. Keep it as an
    // explicit alias so leaving a running match also clears room membership.
    socket.on(CLIENT_EVENTS.matchLeave, leaveRoom);

    socket.on(CLIENT_EVENTS.lobbySelectCharacter, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(selectCharacterSchema, payload);
      if (!data) return;
      const room = this.roomManager.findById(session.roomId);
      if (!room) return this.sendError(socket, ROOM_ERRORS.notInRoom, ERROR_MESSAGES.NOT_IN_ROOM);
      try { room.selectCharacter(session.playerId, data.characterId); this.broadcastRoom(room); }
      catch (error) { this.sendError(socket, error.message, ERROR_MESSAGES[error.message] || 'Karakter tidak valid.'); }
    });

    socket.on(CLIENT_EVENTS.lobbyReady, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(readySchema, payload);
      if (!data) return;
      const room = this.roomManager.findById(session.roomId);
      if (!room) return this.sendError(socket, ROOM_ERRORS.notInRoom, ERROR_MESSAGES.NOT_IN_ROOM);
      try { room.setReady(session.playerId, data.ready); this.broadcastRoom(room); }
      catch (error) { this.sendError(socket, error.message, ERROR_MESSAGES[error.message] || 'Status ready gagal.'); }
    });

    socket.on(CLIENT_EVENTS.lobbyUpdateSettings, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(settingsSchema, payload);
      if (!data) return;
      const room = this.roomManager.findById(session.roomId);
      if (!room) return this.sendError(socket, ROOM_ERRORS.notInRoom, ERROR_MESSAGES.NOT_IN_ROOM);
      try { room.updateSettings(session.playerId, data); this.broadcastRoom(room); }
      catch (error) { this.sendError(socket, error.message, ERROR_MESSAGES[error.message] || 'Pengaturan room gagal.'); }
    });

    socket.on(CLIENT_EVENTS.lobbyStart, () => {
      if (!requireSession()) return;
      const room = this.roomManager.findById(session.roomId);
      if (!room) return this.sendError(socket, ROOM_ERRORS.notInRoom, ERROR_MESSAGES.NOT_IN_ROOM);
      try {
        room.startMatch(session.playerId);
        const runner = new MatchRunner({ room, transport: this, config: this.config, logger: this.logger });
        runner.onFinished = () => this.activeMatches.delete(room.id);
        room.match = runner;
        this.activeMatches.set(room.id, runner);
        runner.start();
        this.broadcastRoom(room);
      } catch (error) {
        this.sendError(socket, error.message, ERROR_MESSAGES[error.message] || 'Match belum dapat dimulai.');
      }
    });

    socket.on(CLIENT_EVENTS.latencyPing, (payload = {}) => {
      socket.emit(SERVER_EVENTS.latencyPong, { clientTime: payload.clientTime, serverTime: Date.now() });
    });

    socket.on(CLIENT_EVENTS.inputMove, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(moveInputSchema, payload);
      if (!data) return;
      const room = this.roomManager.findById(session.roomId);
      const runner = room && this.activeMatches.get(room.id);
      if (!runner) return this.sendError(socket, 'MATCH_NOT_READY', 'Match belum dimulai.');
      runner.acceptInput(session.playerId, data);
    });

    socket.on(CLIENT_EVENTS.actionAttackStart, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(attackStartSchema, payload);
      if (!data) return;
      if (!this.acceptActionId(socket, data.actionId)) return;
      const room = this.roomManager.findById(session.roomId);
      const runner = room && this.activeMatches.get(room.id);
      if (!runner) return this.sendError(socket, 'MATCH_NOT_READY', 'Match belum dimulai.');
      if (!runner.acceptAttackStart(session.playerId, data.aimX, data.aimZ)) this.sendError(socket, 'ACTION_REJECTED', 'Serangan belum dapat digunakan.');
    });

    socket.on(CLIENT_EVENTS.actionAttackRelease, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(attackReleaseSchema, payload);
      if (!data) return;
      if (!this.acceptActionId(socket, data.actionId)) return;
      const room = this.roomManager.findById(session.roomId);
      const runner = room && this.activeMatches.get(room.id);
      if (!runner) return this.sendError(socket, 'MATCH_NOT_READY', 'Match belum dimulai.');
      if (!runner.acceptAttackRelease(session.playerId, data.aimX, data.aimZ)) this.sendError(socket, 'ACTION_REJECTED', 'Serangan belum dapat digunakan.');
    });

    socket.on(CLIENT_EVENTS.actionSuper, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(superSchema, payload);
      if (!data) return;
      if (!this.acceptActionId(socket, data.actionId)) return;
      const room = this.roomManager.findById(session.roomId);
      const runner = room && this.activeMatches.get(room.id);
      if (!runner) return this.sendError(socket, 'MATCH_NOT_READY', 'Match belum dimulai.');
      if (!runner.acceptSuper(session.playerId, data)) this.sendError(socket, 'ACTION_REJECTED', 'Super belum siap atau posisi tidak valid.');
    });

    socket.on(CLIENT_EVENTS.actionItem, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(itemSchema, payload);
      if (!data) return;
      if (!this.acceptActionId(socket, data.actionId)) return;
      const room = this.roomManager.findById(session.roomId);
      const runner = room && this.activeMatches.get(room.id);
      if (!runner) return this.sendError(socket, 'MATCH_NOT_READY', 'Match belum dimulai.');
      if (!runner.acceptItem(session.playerId)) this.sendError(socket, 'ACTION_REJECTED', 'Tidak ada item yang dapat digunakan.');
    });

    socket.on(CLIENT_EVENTS.actionFlicker, (payload = {}) => {
      if (!requireSession()) return;
      const data = validate(flickerSchema, payload);
      if (!data) return;
      if (!this.acceptActionId(socket, data.actionId)) return;
      const room = this.roomManager.findById(session.roomId);
      const runner = room && this.activeMatches.get(room.id);
      if (!runner) return this.sendError(socket, 'MATCH_NOT_READY', 'Match belum dimulai.');
      if (!runner.acceptFlicker(session.playerId, data)) this.sendError(socket, 'ACTION_REJECTED', 'Flicker belum siap digunakan.');
    });

    socket.on('disconnect', (reason) => {
      this.connections.delete(socket.id);
      const disconnected = this.registry.unbind(socket.id);
      if (!disconnected) return;
      const room = this.roomManager.findById(disconnected.roomId);
      if (room) {
        const member = room.players.get(disconnected.playerId);
        if (member) member.connected = false;
        this.activeMatches.get(room.id)?.setPlayerConnected(disconnected.playerId, false);
        this.broadcastRoom(room);
      }
      this.logger.info?.({ playerId: disconnected.playerId, reason }, 'disconnect');
      this.scheduleSessionExpiry(disconnected);
    });
  }

  leaveCurrentRoom(session) {
    const room = this.roomManager.findById(session.roomId);
    if (!room) { session.roomId = null; return; }
    this.activeMatches.get(room.id)?.removePlayer(session.playerId);
    room.removePlayer(session.playerId);
    session.roomId = null;
    this.broadcastRoom(room);
    if (room.players.size === 0) this.stopMatch(room);
    this.logger.info?.({ roomId: room.id, playerId: session.playerId }, 'room leave');
  }

  broadcastRoom(room) {
    this.emitToRoom(room.id, SERVER_EVENTS.roomState, room.toPublicState());
  }

  emitToSocket(socket, event, payload) {
    socket?.emit(event, payload);
  }

  emitToRoom(roomId, event, payload) {
    for (const session of this.registry.sessionsById.values()) {
      if (session.roomId !== roomId || !session.socketId) continue;
      this.connections.get(session.socketId)?.emit(event, payload);
    }
  }

  stopMatch(room) {
    const runner = this.activeMatches.get(room.id);
    if (!runner) return;
    runner.stop();
    this.activeMatches.delete(room.id);
  }

  scheduleSessionExpiry(session) {
    if (session.disconnectTimer) clearTimeout(session.disconnectTimer);
    session.disconnectTimer = setTimeout(() => {
      if (session.socketId) return;
      const room = this.roomManager.findById(session.roomId);
      if (room) {
        this.activeMatches.get(room.id)?.removePlayer(session.playerId);
        room.removePlayer(session.playerId);
        this.broadcastRoom(room);
        if (room.players.size === 0) this.stopMatch(room);
      }
      session.roomId = null;
      this.registry.remove(session);
    }, this.config.reconnectGraceSeconds * 1000);
    session.disconnectTimer.unref?.();
  }

  sendError(socket, code, message) {
    socket.emit(SERVER_EVENTS.roomError, { code, message: message || 'Terjadi kesalahan.' });
  }

  acceptActionId(socket, actionId) {
    const previous = Number.isInteger(socket.data.lastActionId) ? socket.data.lastActionId : -1;
    if (actionId <= previous) return false;
    socket.data.lastActionId = actionId;
    return true;
  }

  createConnection(rawSocket, request) {
    const handlers = new Map();
    const connection = {
      id: randomUUID(),
      data: {},
      handshake: { address: request.socket.remoteAddress || 'unknown' },
      on: (event, handler) => {
        handlers.set(event, handler);
        return connection;
      },
      emit: (event, payload) => {
        if (rawSocket.readyState !== WebSocket.OPEN) return;
        rawSocket.send(JSON.stringify({ type: 'event', event, payload }));
      },
      disconnect: (force = false) => rawSocket.close(force ? 1008 : 1000),
      // Room membership is derived from the authoritative session, not stored
      // in a separate room adapter.
      join: () => {},
      leave: () => {},
    };

    rawSocket.on('message', (rawMessage) => {
      let frame;
      try {
        frame = JSON.parse(rawMessage.toString());
      } catch {
        connection.emit(SERVER_EVENTS.roomError, { code: 'INVALID_PAYLOAD', message: 'Data yang dikirim tidak valid.' });
        return;
      }
      if (!frame || typeof frame.event !== 'string' || frame.event.length > 80) return;
      const handler = handlers.get(frame.event);
      if (!handler) return;
      const ack = typeof frame.requestId === 'string' && frame.requestId.length <= 80
        ? (payload) => {
          if (rawSocket.readyState === WebSocket.OPEN) {
            rawSocket.send(JSON.stringify({ type: 'ack', requestId: frame.requestId, payload }));
          }
        }
        : undefined;
      try {
        handler(frame.payload ?? {}, ack);
      } catch (error) {
        this.logger.error?.({ err: error, event: frame.event }, 'websocket message handler failed');
      }
    });
    rawSocket.on('close', (code, reason) => {
      handlers.get('disconnect')?.(reason?.toString() || `closed:${code}`);
    });
    rawSocket.on('error', (error) => this.logger.warn?.({ err: error, socketId: connection.id }, 'websocket connection error'));
    return connection;
  }

  close() {
    for (const socket of this.connections.values()) socket.disconnect();
    this.connections.clear();
    this.wsServer.close();
  }
}

// Keep the old named import working for callers that have not been renamed yet.
export { WebSocketServer as SocketServer };
