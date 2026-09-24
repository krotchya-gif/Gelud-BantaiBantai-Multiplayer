import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';
import { MapCollision } from '../../shared/maps/MapCollision.js';
import { buildSnapshot } from '../../server/match/SnapshotBuilder.js';
import { NetworkGameSession } from '../../src/multiplayer/NetworkGameSession.js';
import { applyDamage } from '../../shared/simulation/CombatSystem.js';

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

  it('keeps the authoritative Titan leap airborne, invulnerable, and delayed until landing', () => {
    const simulation = new GameSimulation({
      collision: new MapCollision({ minX: -12, maxX: 12, minZ: -12, maxZ: 12 }),
      players: [
        { id: 'titan', name: 'T', characterId: 'titan', x: 0, z: 0 },
        { id: 'target', name: 'D', characterId: 'dusty', x: 0, z: 3 },
      ],
    });
    const titan = simulation.state.players.get('titan');
    const target = simulation.state.players.get('target');
    titan.superCharge = 1;

    expect(simulation.super('titan', { aimX: 0, aimZ: 1, targetX: 0, targetZ: 3 })).toBe(true);
    const leapEvent = simulation.state.events.find((event) => event.type === 'SUPER_DASH' && event.ownerId === 'titan');
    expect(leapEvent.duration).toBeCloseTo(0.75);
    expect(leapEvent.leap).toBe(true);
    expect(titan.airborneT).toBeCloseTo(0.75);
    expect(buildSnapshot(simulation).players.find((player) => player.id === 'titan').airborneT).toBeCloseTo(0.75);
    expect(simulation.attackStart('titan', 0, 1)).toBe(false);
    expect(simulation.flicker('titan', { dirX: 1, dirZ: 0 })).toBe(false);
    expect(applyDamage(simulation.state, titan, 4000, target)).toBe(0);
    expect(titan.hp).toBe(titan.maxHp);
    expect(target.hp).toBe(target.maxHp);

    expect(simulation.setInput('titan', { seq: 1, moveX: 1, moveZ: 0 })).toBe(true);
    const landingEvents = [];
    for (let index = 0; index < 12; index += 1) landingEvents.push(...simulation.tick(1 / 30));
    expect(titan.x).toBe(0);
    expect(titan.airborneT).toBeGreaterThan(0);
    expect(target.hp).toBe(target.maxHp);
    for (let index = 0; index < 12; index += 1) landingEvents.push(...simulation.tick(1 / 30));

    expect(titan.airborneT).toBe(0);
    expect(titan.leapState).toBeNull();
    expect(target.hp).toBe(target.maxHp - 1000);
    expect(landingEvents.some((event) => event.type === 'EXPLOSION' && event.ownerId === 'titan')).toBe(true);
  });

  it('extends the authoritative Titan leap duration in low-gravity terrain', () => {
    const collision = new MapCollision({ minX: -12, maxX: 12, minZ: -12, maxZ: 12 });
    collision.surfaceAt = () => 'low-gravity';
    collision.layout = { gameplay: { lowGravityMultiplier: 0.58 } };
    const simulation = new GameSimulation({
      collision,
      players: [{ id: 'titan', name: 'T', characterId: 'titan', x: 0, z: 0 }],
    });
    const titan = simulation.state.players.get('titan');
    titan.superCharge = 1;

    expect(simulation.super('titan', { aimX: 0, aimZ: 1, targetX: 0, targetZ: 3 })).toBe(true);
    expect(titan.airborneT).toBeCloseTo(0.75 / Math.sqrt(0.58));
    expect(simulation.state.events.find((event) => event.type === 'SUPER_DASH').duration).toBeCloseTo(titan.airborneT);
  });

  it('does not let Gojo Domain freeze an airborne Titan', () => {
    const simulation = new GameSimulation({
      collision: new MapCollision({ minX: -12, maxX: 12, minZ: -12, maxZ: 12 }),
      players: [
        { id: 'titan', name: 'T', characterId: 'titan', x: 0, z: 0 },
        { id: 'gojo', name: 'G', characterId: 'gojo', x: 0, z: 8 },
      ],
    });
    const titan = simulation.state.players.get('titan');
    titan.superCharge = 1;
    simulation.state.players.get('gojo').superCharge = 1;

    expect(simulation.super('titan', { aimX: 0, aimZ: 1, targetX: 0, targetZ: 3 })).toBe(true);
    expect(simulation.super('gojo', { aimX: 0, aimZ: -1, targetX: 0, targetZ: 3 })).toBe(true);
    const events = [];
    for (let index = 0; index < 16; index += 1) events.push(...simulation.tick(1 / 30));

    expect(events.some((event) => event.type === 'DOMAIN_ACTIVATED')).toBe(true);
    expect(titan.airborneT).toBeGreaterThan(0);
    expect(titan.hardCCT).toBe(0);
  });

  it('lets Gojo barrier absorb a domain freeze in the authoritative simulation', () => {
    const simulation = new GameSimulation({
      players: [
        { id: 'attacker', name: 'A', characterId: 'gojo', x: 0, z: 0 },
        { id: 'defender', name: 'B', characterId: 'gojo', x: 2.5, z: 0 },
      ],
    });
    const attacker = simulation.state.players.get('attacker');
    const defender = simulation.state.players.get('defender');
    attacker.superCharge = 1;
    defender.gojoBarrier = true;

    expect(simulation.super('attacker', { aimX: 1, aimZ: 0, targetX: 2.5, targetZ: 0 })).toBe(true);
    const events = [];
    for (let index = 0; index < 20; index += 1) events.push(...simulation.tick(1 / 30));

    expect(defender.gojoBarrier).toBe(false);
    expect(defender.hardCCT).toBe(0);
    expect(events.some((event) => event.type === 'BARRIER_BLOCKED' && event.targetId === 'defender')).toBe(true);
    expect(events.some((event) => event.type === 'HARD_CC' && event.targetId === 'defender')).toBe(false);
  });

  it('applies Gojo pull damage once while the authoritative area pulls and slows', () => {
    const simulation = new GameSimulation({
      collision: new MapCollision({ minX: -12, maxX: 12, minZ: -12, maxZ: 12 }),
      players: [
        { id: 'gojo', name: 'G', characterId: 'gojo', x: 0, z: 0 },
        { id: 'target', name: 'T', characterId: 'dusty', x: 0, z: 3 },
      ],
    });
    const target = simulation.state.players.get('target');

    expect(simulation.skill('gojo', { skill: 1, aimX: 0, aimZ: 1, targetX: 0, targetZ: 2 })).toBe(true);
    simulation.tick(1 / 30);
    const firstPullPosition = target.z;
    for (let index = 0; index < 5; index += 1) simulation.tick(1 / 30);

    expect(target.hp).toBe(target.maxHp - 300);
    expect(target.z).toBeLessThan(firstPullPosition);
    expect(target.slowEffects.get('gojo:gojo')).toMatchObject({ multiplier: 0.7 });
  });

  it('caps Sukuna long slash at three targets and resolves charged flame on the server', () => {
    const simulation = new GameSimulation({
      collision: new MapCollision({ minX: -12, maxX: 12, minZ: -12, maxZ: 12 }),
      players: [
        { id: 'sukuna', name: 'S', characterId: 'sukuna', x: 0, z: 0 },
        { id: 'one', name: '1', characterId: 'dusty', x: 0, z: 2 },
        { id: 'two', name: '2', characterId: 'dusty', x: 0, z: 4 },
        { id: 'three', name: '3', characterId: 'dusty', x: 0, z: 6 },
        { id: 'four', name: '4', characterId: 'dusty', x: 0, z: 7.1 },
      ],
    });

    expect(simulation.skill('sukuna', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    simulation.tick(1 / 30);
    for (const id of ['one', 'two', 'three']) expect(simulation.state.players.get(id).hp).toBe(3300);
    expect(simulation.state.players.get('four').hp).toBe(3900);

    for (let index = 0; index < 30; index += 1) simulation.tick(1 / 30);
    expect(simulation.skill('sukuna', { skill: 2, phase: 'start', aimX: 0, aimZ: 1 })).toBe(true);
    for (let index = 0; index < 30; index += 1) simulation.tick(1 / 30);
    expect(simulation.skill('sukuna', { skill: 2, phase: 'release', aimX: 0, aimZ: 1 })).toBe(true);
    const events = [];
    for (let index = 0; index < 10; index += 1) events.push(...simulation.tick(1 / 30));

    expect(events.some((event) => event.type === 'SKILL_CHARGE_RELEASE' && event.charged)).toBe(true);
    expect(simulation.state.players.get('one').hp).toBeLessThan(3300);
    expect(simulation.state.players.get('one').burnT).toBeGreaterThan(0);
  });

  it('keeps Gojo and Sukuna combat stats and charge state in network snapshots', () => {
    const simulation = new GameSimulation({
      players: [
        { id: 'gojo', name: 'G', characterId: 'gojo' },
        { id: 'sukuna', name: 'S', characterId: 'sukuna' },
      ],
    });
    const gojo = simulation.state.players.get('gojo');
    const sukuna = simulation.state.players.get('sukuna');

    expect(buildSnapshot(simulation).players).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'gojo', characterName: 'Gojo', maxHp: 3000, ammo: 0, gojoBarrier: false, skillCooldowns: [0, 0] }),
      expect.objectContaining({ id: 'sukuna', characterName: 'Sukuna', maxHp: 4200, ammo: 3, skillCooldowns: [0, 0], skill2Charging: false }),
    ]));

    expect(simulation.skill('sukuna', { skill: 2, phase: 'start', aimX: 1, aimZ: 0 })).toBe(true);
    simulation.tick(1 / 30);
    const charged = buildSnapshot(simulation).players.find((player) => player.id === 'sukuna');
    expect(charged.skill2Charging).toBe(true);
    expect(charged.skillCooldowns[1]).toBeGreaterThan(11.9);
    expect(gojo.gojoBarrier).toBe(false);
    expect(sukuna.ammo).toBe(3);
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

  it('falls back to the last aim when a touch tap sends a zero vector', () => {
    const emitted = [];
    const network = {
      playerId: 'p1',
      addEventListener() {},
      emit(event, payload) { emitted.push({ event, payload }); },
    };
    const session = new NetworkGameSession(network);
    session.latestInput = { moveX: 0, moveZ: 0, aimX: 1, aimZ: 0 };
    session.sendAttackStart(0, 0);
    session.sendAttackRelease(0, 0);
    expect(emitted[0].payload).toMatchObject({ aimX: 1, aimZ: 0 });
    expect(emitted[1].payload).toMatchObject({ aimX: 1, aimZ: 0 });
  });

  it.each([
    ['ace', { x: 3, z: 0 }, 'projectile'],
    ['titan', { x: 2, z: 0 }, 'melee'],
    ['naka', { x: 3, z: 0 }, 'projectile'],
    ['syafiah', { x: 3, z: 0 }, 'charged projectile'],
  ])('uses the previous aim for zero-vector %s attacks', (characterId, targetPosition, kind) => {
    const simulation = new GameSimulation({
      players: [
        { id: 'attacker', name: 'A', characterId, x: 0, z: 0 },
        { id: 'target', name: 'B', characterId: 'dusty', x: targetPosition.x, z: targetPosition.z },
      ],
    });
    const attacker = simulation.state.players.get('attacker');
    attacker.input.aimX = 1;
    attacker.input.aimZ = 0;
    const target = simulation.state.players.get('target');
    expect(simulation.attackStart('attacker', 0, 0)).toBe(true);
    if (characterId === 'syafiah') {
      for (let index = 0; index < 22; index += 1) simulation.tick(1 / 30);
      expect(simulation.attackRelease('attacker', 0, 0)).toBe(true);
    }
    const events = [];
    for (let index = 0; index < 36; index += 1) events.push(...simulation.tick(1 / 30));
    expect(target.hp).toBeLessThan(target.maxHp);
    if (kind.includes('projectile')) {
      const spawns = events.filter((event) => event.type === 'PROJECTILE_SPAWN');
      expect(spawns.some(({ projectile }) => Math.abs(projectile.dirX - 1) < 0.01 && Math.abs(projectile.dirZ) < 0.01)).toBe(true);
    }
  });
});
