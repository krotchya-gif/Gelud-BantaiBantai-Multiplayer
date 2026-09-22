import { describe, expect, it } from 'vitest';
import { Room } from '../../server/rooms/Room.js';
import { RoomManager } from '../../server/rooms/RoomManager.js';

const player = (id, joinedAt = Date.now()) => ({ id, playerId: id, name: id, joinedAt });

describe('Room', () => {
  it('adds players and transfers host in join order', () => {
    const room = new Room({ code: 'K7M9Q2', maxPlayers: 2 });
    room.addPlayer(player('p1', 1));
    room.addPlayer(player('p2', 2));
    expect(room.hostPlayerId).toBe('p1');
    room.removePlayer('p1');
    expect(room.hostPlayerId).toBe('p2');
    expect(room.toPublicState().players).toHaveLength(1);
  });

  it('enforces lobby settings and start authority', () => {
    const room = new Room({ code: 'K7M9Q2', maxPlayers: 4 });
    room.addPlayer(player('p1'));
    room.addPlayer(player('p2'));
    expect(() => room.updateSettings('p2', { mapId: 'x' })).toThrow('HOST_ONLY');
    room.updateSettings('p1', { mode: 'blitz', mapId: 'frozen-lake' });
    room.startMatch('p1');
    expect(room.status).toBe('starting');
  });
});

describe('RoomManager', () => {
  it('indexes and cleans empty rooms', () => {
    const manager = new RoomManager({ roomIdleTtlSeconds: 1, codeFactory: () => 'K7M9Q2', logger: {} });
    const room = manager.createRoom(player('p1'));
    expect(manager.findByCode('k7m9q2')).toBe(room);
    room.removePlayer('p1');
    manager.cleanup(Date.now() + 1001);
    expect(manager.findByCode('K7M9Q2')).toBeNull();
  });
});
