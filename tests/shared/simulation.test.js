import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';
import { MapCollision } from '../../shared/maps/MapCollision.js';
import { buildSnapshot } from '../../server/match/SnapshotBuilder.js';

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

  it('picks up a second item and consumes only the selected slot', () => {
    const simulation = new GameSimulation({
      collision: new MapCollision(),
      players: [{ id: 'p1', name: 'A', characterId: 'dusty', x: 0, z: 12 }],
    });
    const player = simulation.state.players.get('p1');
    player.hp = Math.round(player.maxHp * 0.5);
    player.heldItems = ['shield', null];
    player.heldItem = 'shield';

    simulation.tick(1 / 30);

    expect(player.heldItems).toEqual(['shield', 'heal']);
    expect(player.heldItem).toBe('shield');
    expect(buildSnapshot(simulation).players[0].heldItems).toEqual(['shield', 'heal']);
    expect(simulation.item('p1', 1)).toBe(true);
    expect(player.heldItems).toEqual(['shield', null]);
    expect(player.hp).toBeGreaterThan(Math.round(player.maxHp * 0.5));
    expect(simulation.item('p1', 0)).toBe(true);
    expect(player.heldItems).toEqual([null, null]);
    expect(player.shieldT).toBe(3);
    expect(simulation.state.events.filter((event) => event.type === 'ITEM_USED').map((event) => event.slot)).toEqual([1, 0]);
  });

  it('enforces and snapshots the authoritative Flicker cooldown', () => {
    const simulation = new GameSimulation({
      collision: new MapCollision(),
      players: [{ id: 'p1', name: 'A', characterId: 'dusty', x: 0, z: 0 }],
    });
    simulation.state.match.elapsed = 29;
    expect(simulation.flicker('p1', { dirX: 1, dirZ: 0 })).toBe(false);

    simulation.state.match.elapsed = 30;
    const player = simulation.state.players.get('p1');
    player.spawnProtectionT = 1;
    expect(simulation.flicker('p1', { dirX: 1, dirZ: 0 })).toBe(false);
    player.spawnProtectionT = 0;
    expect(simulation.flicker('p1', { dirX: 1, dirZ: 0 })).toBe(true);
    expect(buildSnapshot(simulation).players[0].flickerRemaining).toBe(30);
    simulation.state.match.elapsed = 59.25;
    expect(buildSnapshot(simulation).players[0].flickerRemaining).toBe(0.75);
    simulation.state.match.elapsed = 60;
    expect(buildSnapshot(simulation).players[0].flickerRemaining).toBe(0);
  });

  it('warns at 60 seconds, explodes, and schedules the next red zone at 120 seconds', () => {
    const simulation = new GameSimulation({
      collision: new MapCollision(),
      players: [{ id: 'p1', name: 'A', characterId: 'dusty', x: 0, z: 0 }],
    });
    const player = simulation.state.players.get('p1');
    simulation.trapRng.pick = () => 'explosion';
    simulation.trapRng.next = () => 0.5;

    for (let second = 0; second < 59; second += 1) simulation.tick(1);
    expect(simulation.state.traps.size).toBe(0);

    const warningEvents = simulation.tick(1);
    const [trap] = simulation.state.traps.values();
    expect(warningEvents.some((event) => event.type === 'TRAP_WARNING')).toBe(true);
    expect(trap).toMatchObject({ kind: 'explosion', phase: 'warning', x: 0, z: 0, remaining: 5 });
    expect(buildSnapshot(simulation).traps[0]).toMatchObject({ id: trap.id, phase: 'warning' });

    const hpBeforeBlast = player.hp;
    let blastEvents = [];
    for (let second = 0; second < 5; second += 1) blastEvents = simulation.tick(1);
    expect(blastEvents.some((event) => event.type === 'TRAP_EXPLOSION')).toBe(true);
    expect(player.hp).toBe(hpBeforeBlast - 1450);
    expect(simulation.state.traps.size).toBe(0);

    for (let second = 65; second < 119; second += 1) simulation.tick(1);
    expect(simulation.state.traps.size).toBe(0);
    expect(simulation.tick(1).some((event) => event.type === 'TRAP_WARNING')).toBe(true);
  });

  it.each([
    ['burning', 240],
    ['poison', 190],
  ])('activates the %s area and applies its authoritative damage', (kind, expectedDamage) => {
    const simulation = new GameSimulation({
      collision: new MapCollision(),
      players: [{ id: 'p1', name: 'A', characterId: 'dusty', x: 0, z: 0 }],
    });
    const player = simulation.state.players.get('p1');
    simulation.trapRng.pick = () => kind;
    simulation.trapRng.next = () => 0.5;
    for (let second = 0; second < 65; second += 1) simulation.tick(1);

    const [trap] = simulation.state.traps.values();
    expect(trap).toMatchObject({ kind, phase: 'active', remaining: 8 });
    expect(player.hp).toBe(player.maxHp - expectedDamage);
    expect(buildSnapshot(simulation).traps[0]).toMatchObject({ kind, phase: 'active' });
  });
});
