import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';
import { MapCollision } from '../../shared/maps/MapCollision.js';
import { buildSnapshot } from '../../server/match/SnapshotBuilder.js';

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

  it('keeps solo character names and weapon state in the multiplayer snapshot', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'Player', characterId: 'ace' }] });
    const player = simulation.state.players.get('p1');
    expect(buildSnapshot(simulation).players[0]).toMatchObject({ name: 'Player', characterId: 'ace', characterName: 'Zeyd', ammo: 3, flickerRemaining: 30 });
    expect(simulation.attackStart('p1', 1, 0)).toBe(true);
    expect(player.ammo).toBe(2);
    expect(buildSnapshot(simulation).players[0].reloadT).toBe(0);
  });

  it('keeps projectile ownership and attack color in multiplayer events', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'Player', characterId: 'fuse' }] });
    expect(simulation.attackStart('p1', 1, 0)).toBe(true);
    const spawn = simulation.tick(1 / 30).find((event) => event.type === 'PROJECTILE_SPAWN');
    expect(spawn.projectile).toMatchObject({ ownerId: 'p1', color: 0xff7a2a, kind: 'bomb' });
  });

  it('keeps super area colors in snapshots and wave events', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'Player', characterId: 'syafiah' }] });
    simulation.state.players.get('p1').superCharge = 1;
    expect(simulation.super('p1', { aimX: 1, aimZ: 0, targetX: 4, targetZ: 0 })).toBe(true);
    const snapshot = buildSnapshot(simulation);
    expect(snapshot.areaEffects[0].color).toBe(0xfff0aa);
    expect(simulation.tick(1 / 30).some((event) => event.type === 'SUPER_ZONE' && event.color === 0xfff0aa)).toBe(true);
  });

  it('applies the same movement modifiers while charging and using speed items', () => {
    const simulation = new GameSimulation({ mode: 'deathmatch', players: [{ id: 'p1', name: 'A', characterId: 'syafiah' }] });
    const player = simulation.state.players.get('p1');
    player.input = { seq: 1, moveX: 1, moveZ: 0, aimX: 1, aimZ: 0 };
    player.chargeStartedAt = 0;
    simulation.tick(1 / 30);
    const chargingDistance = player.x;
    player.x = 0;
    player.chargeStartedAt = null;
    player.itemSpeedT = 4;
    simulation.tick(1 / 30);
    expect(player.x).toBeGreaterThan(chargingDistance);
  });

  it('keeps Flicker on one non-stacking cooldown across death and respawn', () => {
    const simulation = new GameSimulation({ mode: 'deathmatch', players: [{ id: 'p1', name: 'A', characterId: 'dusty' }] });
    const player = simulation.state.players.get('p1');
    player.flickerReadyAt = 0;
    expect(simulation.flicker('p1', { dirX: 1, dirZ: 0 })).toBe(true);
    expect(player.flickerReadyAt).toBe(30);
    expect(simulation.flicker('p1', { dirX: 1, dirZ: 0 })).toBe(false);
    simulation.tick(1 / 30);
    expect(player.flickerInvulnT).toBeGreaterThan(0);
    player.alive = false;
    player.hp = 0;
    for (let index = 0; index < 900; index += 1) simulation.tick(1 / 30);
    expect(player.alive).toBe(true);
    expect(player.flickerReadyAt).toBe(30);
    expect(buildSnapshot(simulation).players[0].flickerRemaining).toBe(0);
  });

  it('keeps burst weapons timed instead of spawning the whole volley at once', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'A', characterId: 'ace' }] });
    expect(simulation.attackStart('p1', 1, 0)).toBe(true);
    expect(simulation.state.projectiles.size).toBe(0);
    simulation.tick(1 / 30);
    expect(simulation.state.projectiles.size).toBe(1);
    expect(simulation.state.players.get('p1').burstState.remaining).toBe(5);
    simulation.tick(1 / 30);
    simulation.tick(1 / 30);
    simulation.tick(1 / 30);
    expect(simulation.state.projectiles.size).toBeGreaterThan(1);
  });

  it('parries a projectile from the direction the iaido player faces', () => {
    const simulation = new GameSimulation({
      players: [
        { id: 'attacker', name: 'A', characterId: 'dusty', x: 0, z: 0 },
        { id: 'defender', name: 'B', characterId: 'ello', x: 0, z: 1.5 },
      ],
    });
    const attacker = simulation.state.players.get('attacker');
    const defender = simulation.state.players.get('defender');
    defender.superCharge = 1;
    defender.facing = Math.PI;
    expect(simulation.super('defender', { aimX: 0, aimZ: -1, targetX: 0, targetZ: 0 })).toBe(true);
    expect(simulation.attackStart('attacker', 0, 1)).toBe(true);
    const events = [];
    for (let index = 0; index < 4; index += 1) events.push(...simulation.tick(1 / 30));
    expect(events.some((event) => event.type === 'PARRY')).toBe(true);
    expect(attacker.hp).toBe(attacker.maxHp - 1500);
    expect(defender.iaidoState).toBeNull();
  });
});
