import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';
import { MapCollision } from '../../shared/maps/MapCollision.js';

describe('authoritative super and items', () => {
  it('uses a charged super and emits its authoritative event', () => {
    const simulation = new GameSimulation({
      players: [
        { id: 'p1', name: 'A', characterId: 'naka', x: 0, z: 0 },
        { id: 'p2', name: 'B', characterId: 'dusty', x: 20, z: 0 },
      ],
    });
    simulation.state.players.get('p1').superCharge = 1;
    expect(simulation.super('p1', { aimX: 1, aimZ: 0, targetX: 5, targetZ: 0 })).toBe(true);
    const events = simulation.tick(1 / 30);
    expect(events.some((event) => event.type === 'SUPER_USED')).toBe(true);
    expect(simulation.state.players.get('p1').superCharge).toBe(0);
  });

  it('picks up and consumes an item on the server', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'A', characterId: 'dusty', x: 0, z: 0 }] });
    const item = [...simulation.state.items.values()][4];
    item.x = 0; item.z = 0; item.kind = 'shield';
    simulation.tick(1 / 30);
    const player = simulation.state.players.get('p1');
    expect(player.heldItem).toBe('shield');
    expect(simulation.item('p1')).toBe(true);
    expect(player.shieldT).toBeGreaterThan(0);
  });

  it('respawns deathmatch players after the authoritative delay', () => {
    const simulation = new GameSimulation({ mode: 'deathmatch', players: [{ id: 'p1', name: 'A', characterId: 'dusty' }] });
    const player = simulation.state.players.get('p1');
    player.alive = false; player.hp = 0;
    for (let index = 0; index < 160; index += 1) simulation.tick(1 / 30);
    expect(player.alive).toBe(true);
    expect(player.hp).toBe(player.maxHp);
  });

  it('stops authoritative projectiles at map blockers', () => {
    const collision = new MapCollision({
      minX: -10, maxX: 10, minZ: -10, maxZ: 10,
      blockers: [{ minX: 1.5, maxX: 2.5, minZ: -3, maxZ: 3 }],
    });
    const simulation = new GameSimulation({
      collision,
      players: [
        { id: 'p1', name: 'A', characterId: 'ace', x: 0, z: 0 },
        { id: 'p2', name: 'B', characterId: 'dusty', x: 5, z: 0 },
      ],
    });
    const target = simulation.state.players.get('p2');
    expect(simulation.attackStart('p1', 1, 0)).toBe(true);
    for (let index = 0; index < 12; index += 1) simulation.tick(1 / 30);
    expect(target.hp).toBe(target.maxHp);
    expect(simulation.state.projectiles.size).toBe(0);
  });
});
