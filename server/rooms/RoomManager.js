import { createRoomCode } from './RoomCode.js';
import { Room } from './Room.js';

export class RoomManager {
  constructor({ maxPlayersPerRoom = 8, roomIdleTtlSeconds = 60, logger = console, codeFactory = createRoomCode } = {}) {
    this.maxPlayersPerRoom = maxPlayersPerRoom;
    this.roomIdleTtlMs = roomIdleTtlSeconds * 1000;
    this.logger = logger;
    this.codeFactory = codeFactory;
    this.roomsById = new Map();
    this.roomsByCode = new Map();
  }

  createRoom(player, settings = {}) {
    let code;
    do code = this.codeFactory(); while (this.roomsByCode.has(code));
    const room = new Room({
      code,
      mode: settings.mode || 'deathmatch',
      mapId: settings.mapId || 'open',
      maxPlayers: Math.min(this.maxPlayersPerRoom, settings.maxPlayers || this.maxPlayersPerRoom),
    });
    room.addPlayer(player);
    this.roomsById.set(room.id, room);
    this.roomsByCode.set(room.code, room);
    this.logger.info?.({ roomId: room.id, code: room.code }, 'room create');
    return room;
  }

  findByCode(code) {
    return this.roomsByCode.get(String(code || '').trim().toUpperCase()) || null;
  }

  findById(id) {
    return this.roomsById.get(id) || null;
  }

  destroy(room) {
    this.roomsById.delete(room.id);
    this.roomsByCode.delete(room.code);
  }

  cleanup(now = Date.now()) {
    for (const room of this.roomsById.values()) {
      if (room.players.size === 0 && room.lastEmptyAt !== null && now - room.lastEmptyAt >= this.roomIdleTtlMs) {
        this.destroy(room);
        this.logger.info?.({ roomId: room.id, code: room.code }, 'room cleanup');
      }
    }
  }
}
