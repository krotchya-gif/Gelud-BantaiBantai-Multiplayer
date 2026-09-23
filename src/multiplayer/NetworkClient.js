import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/protocol/events.js';
import { PROTOCOL_VERSION, CLIENT_BUILD } from '../../shared/protocol/version.js';

function getSessionStorage() {
  try { return globalThis.sessionStorage || null; } catch { return null; }
}

function buildWebSocketUrl(value) {
  const fallback = globalThis.location?.origin || 'http://localhost:3200';
  const url = new URL(value || fallback, fallback);
  if (url.protocol === 'http:') url.protocol = 'ws:';
  else if (url.protocol === 'https:') url.protocol = 'wss:';
  if (url.pathname === '/' || url.pathname === '') url.pathname = '/ws';
  return url.toString();
}

export class NetworkClient extends EventTarget {
  constructor({ url, name = 'Player', autoConnect = false } = {}) {
    super();
    this.url = buildWebSocketUrl(url || import.meta.env.VITE_MULTIPLAYER_URL || globalThis.location?.origin);
    this.name = name;
    this.storage = getSessionStorage();
    this.sessionId = this.storage?.getItem('gbh-session-id') || null;
    this.reconnectToken = this.storage?.getItem('gbh-reconnect-token') || null;
    this.roomLeaveRequested = false;
    this.playerId = null;
    this.socket = null;
    this.manualDisconnect = false;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.nextRequestId = 0;
    this.pendingAcks = new Map();
    if (autoConnect) this.connect();
  }

  connect() {
    if (this.socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(this.socket.readyState)) return this.socket;
    this.manualDisconnect = false;
    clearTimeout(this.reconnectTimer);
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.addEventListener('open', () => {
      if (this.socket !== socket) return;
      this.reconnectAttempts = 0;
      this.hello();
      this.dispatchEvent(new CustomEvent('connect'));
    });
    socket.addEventListener('message', (event) => this.handleMessage(event.data));
    socket.addEventListener('error', (error) => {
      this.dispatchEvent(new CustomEvent('connect_error', { detail: error }));
    });
    socket.addEventListener('close', (event) => {
      if (this.socket === socket) this.socket = null;
      for (const pending of this.pendingAcks.values()) pending({ ok: false, disconnected: true });
      this.pendingAcks.clear();
      this.dispatchEvent(new CustomEvent('disconnect', { detail: { reason: event.reason || `closed:${event.code}` } }));
      if (!this.manualDisconnect && !this.roomLeaveRequested) this.scheduleReconnect();
    });
    return socket;
  }

  handleMessage(rawMessage) {
    let frame;
    try { frame = JSON.parse(typeof rawMessage === 'string' ? rawMessage : String(rawMessage)); }
    catch { return; }
    if (frame?.type === 'ack' && typeof frame.requestId === 'string') {
      const callback = this.pendingAcks.get(frame.requestId);
      if (callback) {
        this.pendingAcks.delete(frame.requestId);
        callback(frame.payload);
      }
      return;
    }
    if (!frame || typeof frame.event !== 'string') return;
    const payload = frame.payload;
    if (frame.event === SERVER_EVENTS.sessionAccepted) {
      this.sessionId = payload.sessionId;
      this.playerId = payload.playerId;
      this.reconnectToken = payload.reconnectToken || null;
      this.storage?.setItem('gbh-session-id', this.sessionId);
      if (this.reconnectToken) this.storage?.setItem('gbh-reconnect-token', this.reconnectToken);
    }
    this.dispatchEvent(new CustomEvent(frame.event, { detail: payload }));
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.manualDisconnect) return;
    const delay = Math.min(5000, 250 * (2 ** Math.min(this.reconnectAttempts, 4)));
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
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

  emit(event, payload = {}, ack) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    const frame = { type: 'event', event, payload };
    if (typeof ack === 'function') {
      const requestId = `r_${++this.nextRequestId}`;
      frame.requestId = requestId;
      this.pendingAcks.set(requestId, ack);
    }
    this.socket.send(JSON.stringify(frame));
    return true;
  }

  leaveRoom() {
    this.roomLeaveRequested = true;
    if (!this.socket) return Promise.resolve({ ok: true });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result = { ok: true }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.dispatchEvent(new CustomEvent('room-left', { detail: result }));
        resolve(result);
      };
      const timeout = setTimeout(() => finish({ ok: false, timeout: true }), 1500);
      if (!this.emit(CLIENT_EVENTS.roomLeave, {}, finish)) finish({ ok: false, disconnected: true });
    });
  }

  disconnect() {
    this.manualDisconnect = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
  }
}
