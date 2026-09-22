import { randomUUID } from 'node:crypto';
import { sanitizePlayerName } from '../security/NameSanitizer.js';

export class ConnectionRegistry {
  constructor() {
    this.sessionsById = new Map();
    this.sessionsBySocketId = new Map();
  }

  create(name = 'Player') {
    const session = {
      sessionId: randomUUID(),
      playerId: `p_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      reconnectToken: randomUUID() + randomUUID(),
      name: sanitizePlayerName(name),
      socketId: null,
      roomId: null,
      createdAt: Date.now(),
    };
    this.sessionsById.set(session.sessionId, session);
    return session;
  }

  bind(session, socket) {
    if (session.socketId) this.sessionsBySocketId.delete(session.socketId);
    session.socketId = socket.id;
    this.sessionsBySocketId.set(socket.id, session);
  }

  bySocket(socketId) {
    return this.sessionsBySocketId.get(socketId) || null;
  }

  bySession(sessionId) {
    return this.sessionsById.get(sessionId) || null;
  }

  unbind(socketId) {
    const session = this.sessionsBySocketId.get(socketId) || null;
    this.sessionsBySocketId.delete(socketId);
    if (session) session.socketId = null;
    return session;
  }

  remove(session) {
    if (session.socketId) this.sessionsBySocketId.delete(session.socketId);
    this.sessionsById.delete(session.sessionId);
  }
}
