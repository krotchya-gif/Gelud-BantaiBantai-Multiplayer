import { io } from 'socket.io-client';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/protocol/events.js';
import { PROTOCOL_VERSION, CLIENT_BUILD } from '../../shared/protocol/version.js';

export class NetworkClient extends EventTarget {
  constructor({ url, name = 'Player', autoConnect = false } = {}) {
    super();
    this.url = url || import.meta.env.VITE_MULTIPLAYER_URL || window.location.origin;
    this.name = name;
    this.sessionId = sessionStorage.getItem('gbh-session-id') || null;
    this.reconnectToken = sessionStorage.getItem('gbh-reconnect-token') || null;
    this.roomLeaveRequested = false;
    this.playerId = null;
    this.socket = null;
    if (autoConnect) this.connect();
  }

  connect() {
    if (this.socket) return this.socket;
    this.socket = io(this.url, { transports: ['websocket', 'polling'], autoConnect: true });
    this.socket.onAny((event, payload) => this.dispatchEvent(new CustomEvent(event, { detail: payload })));
    this.socket.on(SERVER_EVENTS.sessionAccepted, (payload) => {
      this.sessionId = payload.sessionId;
      this.playerId = payload.playerId;
      this.reconnectToken = payload.reconnectToken || null;
      sessionStorage.setItem('gbh-session-id', this.sessionId);
      if (this.reconnectToken) sessionStorage.setItem('gbh-reconnect-token', this.reconnectToken);
    });
    this.socket.on('connect', () => this.hello());
    this.socket.on('connect', () => this.dispatchEvent(new CustomEvent('connect')));
    this.socket.on('disconnect', (reason) => this.dispatchEvent(new CustomEvent('disconnect', { detail: { reason } })));
    this.socket.on('connect_error', (error) => this.dispatchEvent(new CustomEvent('connect_error', { detail: error })));
    return this.socket;
  }

  hello() {
    this.emit(CLIENT_EVENTS.sessionHello, {
      protocolVersion: PROTOCOL_VERSION,
      clientBuild: CLIENT_BUILD,
      sessionId: this.sessionId || undefined,
      reconnectToken: this.reconnectToken || undefined,
      name: this.name,
    });
  }

  emit(event, payload) {
    this.socket?.emit(event, payload);
  }

  leaveRoom() {
    this.roomLeaveRequested = true;
    if (!this.socket) return Promise.resolve({ ok: true });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result = { ok: true }) => {
        if (settled) return;
        settled = true;
        this.dispatchEvent(new CustomEvent('room-left', { detail: result }));
        resolve(result);
      };
      const timeout = setTimeout(() => finish({ ok: false, timeout: true }), 1500);
      this.socket.emit(CLIENT_EVENTS.roomLeave, (result) => {
        clearTimeout(timeout);
        finish(result);
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
