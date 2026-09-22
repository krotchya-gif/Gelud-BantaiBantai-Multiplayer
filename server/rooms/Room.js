import { randomUUID } from 'node:crypto';

const VALID_CHARACTERS = new Set(['dusty', 'ace', 'fuse', 'titan', 'volt', 'naka', 'ello', 'syafiah']);

export class Room {
  constructor({ code, maxPlayers = 8, mode = 'deathmatch', mapId = 'open', now = Date.now() }) {
    this.id = `room_${randomUUID()}`;
    this.code = code;
    this.hostPlayerId = null;
    this.status = 'lobby';
    this.createdAt = now;
    this.lastEmptyAt = null;
    this.settings = { mode, mapId, maxPlayers };
    this.players = new Map();
    this.match = null;
  }

  get isFull() {
    return this.players.size >= this.settings.maxPlayers;
  }

  addPlayer(player) {
    if (this.status !== 'lobby') throw new Error('MATCH_ALREADY_RUNNING');
    if (this.isFull) throw new Error('ROOM_FULL');
    const playerId = player.id || player.playerId;
    if (this.players.has(playerId)) return this.players.get(playerId);
    const record = {
      id: playerId,
      name: player.name,
      characterId: player.characterId || 'dusty',
      ready: false,
      connected: true,
      joinedAt: player.joinedAt || Date.now(),
    };
    this.players.set(record.id, record);
    if (!this.hostPlayerId) this.hostPlayerId = record.id;
    this.lastEmptyAt = null;
    return record;
  }

  removePlayer(playerId) {
    const removed = this.players.get(playerId) || null;
    this.players.delete(playerId);
    if (this.hostPlayerId === playerId) {
      const next = [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      this.hostPlayerId = next?.id || null;
    }
    if (this.players.size === 0) this.lastEmptyAt = Date.now();
    return removed;
  }

  selectCharacter(playerId, characterId) {
    if (!VALID_CHARACTERS.has(characterId)) throw new Error('INVALID_CHARACTER');
    const player = this.players.get(playerId);
    if (!player) throw new Error('NOT_IN_ROOM');
    player.characterId = characterId;
  }

  setReady(playerId, ready) {
    const player = this.players.get(playerId);
    if (!player) throw new Error('NOT_IN_ROOM');
    player.ready = ready;
  }

  updateSettings(playerId, settings) {
    if (this.hostPlayerId !== playerId) throw new Error('HOST_ONLY');
    if (this.status !== 'lobby') throw new Error('INVALID_ROOM_STATE');
    if (settings.mode) this.settings.mode = settings.mode;
    if (settings.mapId) this.settings.mapId = settings.mapId;
    if (settings.maxPlayers !== undefined) {
      if (settings.maxPlayers < this.players.size || settings.maxPlayers > 8 || settings.maxPlayers < 2) {
        throw new Error('INVALID_ROOM_SETTINGS');
      }
      this.settings.maxPlayers = settings.maxPlayers;
    }
  }

  canStart(minimumPlayers = 2) {
    return this.status === 'lobby' && this.players.size >= minimumPlayers;
  }

  startMatch(playerId, minimumPlayers = 2) {
    if (this.hostPlayerId !== playerId) throw new Error('HOST_ONLY');
    if (!this.canStart(minimumPlayers)) throw new Error('MINIMUM_PLAYERS_REQUIRED');
    this.status = 'starting';
    return this.status;
  }

  toPublicState() {
    return {
      id: this.id,
      code: this.code,
      hostPlayerId: this.hostPlayerId,
      status: this.status,
      settings: { ...this.settings },
      players: [...this.players.values()].map(({ id, name, characterId, ready, connected }) => ({
        id, name, characterId, ready, connected,
      })),
    };
  }
}
