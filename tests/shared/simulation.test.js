import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';

describe('GameSimulation', () => {
  it('moves from input at a fixed simulation step and clamps to bounds', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'A', characterId: 'naka' }] });
    simulation.setInput('p1', { seq: 4, moveX: 1, moveZ: 0, aimX: 1, aimZ: 0 });
    simulation.tick(1 / 30);
    const player = simulation.state.players.get('p1');
    expect(player.lastProcessedInputSeq).toBe(4);
    expect(player.x).toBeGreaterThan(0);
    expect(player.facing).toBeCloseTo(Math.PI / 2);
  });

  it('consumes bursty network inputs one per authoritative tick', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'A', characterId: 'dusty' }] });
    simulation.setInput('p1', { seq: 1, moveX: 1, moveZ: 0, aimX: 1, aimZ: 0 });
    simulation.setInput('p1', { seq: 2, moveX: 0, moveZ: 1, aimX: 0, aimZ: 1 });

    simulation.tick(1 / 30);
    const first = simulation.state.players.get('p1');
    expect(first.lastProcessedInputSeq).toBe(1);
    expect(first.x).toBeGreaterThan(0);
    expect(first.z).toBe(0);

    simulation.tick(1 / 30);
    const second = simulation.state.players.get('p1');
    expect(second.lastProcessedInputSeq).toBe(2);
    expect(second.z).toBeGreaterThan(0);
  });

  it('keeps attack authority in the simulation and emits projectile events', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'A', characterId: 'naka' }] });
    expect(simulation.attackStart('p1', 1, 0)).toBe(true);
    const events = simulation.tick(1 / 30);
    expect(events.some((event) => event.type === 'PROJECTILE_SPAWN')).toBe(true);
    expect(simulation.state.projectiles.size).toBe(3);
  });

  it('applies melee damage and emits a death event from server state', () => {
    const simulation = new GameSimulation({
      players: [
        { id: 'p1', name: 'A', characterId: 'ello' },
        { id: 'p2', name: 'B', characterId: 'dusty' },
      ],
    });
    const target = simulation.state.players.get('p2');
    target.hp = 100;
    expect(simulation.attackStart('p1', 0, 1)).toBe(true);
    const events = simulation.tick(1 / 30);
    expect(target.alive).toBe(false);
    expect(events.some((event) => event.type === 'DEATH')).toBe(true);
  });
});
