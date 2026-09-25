import { describe, expect, it } from 'vitest';
import { CHARACTER_DEFS } from '../../shared/data/characters.js';
import { MapCollision } from '../../shared/maps/MapCollision.js';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';
import { applyDamage } from '../../shared/simulation/CombatSystem.js';
import { buildSnapshot } from '../../server/match/SnapshotBuilder.js';
import { predictMovement } from '../../src/multiplayer/Prediction.js';

const makeSimulation = (players, collision = new MapCollision({ minX: -16, maxX: 16, minZ: -16, maxZ: 16 })) =>
  new GameSimulation({ mode: 'classic', players, collision });

const runTicks = (simulation, count) => {
  const events = [];
  for (let index = 0; index < count; index += 1) events.push(...simulation.tick(1 / 30));
  return events;
};

function makeCoverCollision({ permanentWall = false } = {}) {
  const size = 12;
  const origin = { x: -6, z: -6 };
  const cells = { EMPTY: 0, WALL: 1, WATER: 2 };
  const cellsData = Array.from({ length: size * size }, () => ({ kind: cells.EMPTY }));
  cellsData[6 * size + 6] = { kind: cells.WALL, style: 'crate' };
  if (permanentWall) cellsData[6 * size + 7] = { kind: cells.WALL, style: 'rock' };
  return {
    collision: new MapCollision({ minX: -6, maxX: 6, minZ: -6, maxZ: 6, layout: { size, origin, cells, cellsData } }),
    cellsData,
    wallIndex: 6 * size + 6,
  };
}

describe('authoritative active skills for the full roster', () => {
  it('defines two active skills for every playable character and preserves the requested sorcerer tuning', () => {
    for (const definition of Object.values(CHARACTER_DEFS)) expect(definition.skills).toHaveLength(2);
    expect(CHARACTER_DEFS.gojo.skills[0].duration).toBe(2.4);
    expect(CHARACTER_DEFS.gojo.super.duration).toBe(4);
    expect(CHARACTER_DEFS.sukuna.role).toBe('Aggressive Fire Mage');
    expect(CHARACTER_DEFS.sukuna.skills[0].range).toBe(10);
    expect(CHARACTER_DEFS.sukuna.skills[1].chargedRange).toBe(13.5);
    expect(CHARACTER_DEFS.sukuna.super.duration).toBe(4);
  });

  it('recharges Gojo barrier after five seconds and keeps Blue authoritative for 2.4 seconds', () => {
    const barrierGame = makeSimulation([
      { id: 'gojo', name: 'Gojo', characterId: 'gojo', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 2 },
    ]);
    const gojo = barrierGame.state.players.get('gojo');
    const enemy = barrierGame.state.players.get('enemy');
    gojo.gojoBarrier = true;
    expect(applyDamage(barrierGame.state, gojo, 500, enemy)).toBe(0);
    expect(gojo.gojoBarrier).toBe(false);
    expect(gojo.gojoBarrierReadyAt).toBe(5);
    barrierGame.state.match.elapsed = 4.9;
    barrierGame.tick(0.1);
    expect(gojo.gojoBarrier).toBe(true);

    const blueGame = makeSimulation([
      { id: 'gojo', name: 'Gojo', characterId: 'gojo', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 2 },
    ]);
    const blueTarget = blueGame.state.players.get('enemy');
    expect(blueGame.skill('gojo', { skill: 1, aimX: 0, aimZ: 1, targetX: 0, targetZ: 2 })).toBe(true);
    const area = [...blueGame.state.areaEffects.values()][0];
    expect(area.remaining).toBe(2.4);
    runTicks(blueGame, 1);
    const hpAfterFirstWave = blueTarget.hp;
    expect(hpAfterFirstWave).toBeLessThan(blueTarget.maxHp);
    runTicks(blueGame, 70);
    expect(blueGame.state.areaEffects.has(area.id)).toBe(true);
    runTicks(blueGame, 1);
    expect(blueGame.state.areaEffects.has(area.id)).toBe(false);
    expect(blueTarget.hp).toBe(hpAfterFirstWave);
  });

  it('keeps both four-second domains in authoritative state and snapshots', () => {
    for (const [id, characterId, targetZ] of [['gojo', 'gojo', 4], ['sukuna', 'sukuna', 8]]) {
      const simulation = makeSimulation([
        { id, name: id, characterId, x: 0, z: 0, superCharge: 1 },
        { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: targetZ },
      ]);
      expect(simulation.super(id, { aimX: 0, aimZ: 1, targetX: 0, targetZ })).toBe(true);
      const area = [...simulation.state.areaEffects.values()][0];
      expect(area.activeDuration).toBe(4);
      expect(buildSnapshot(simulation).areaEffects[0]).toMatchObject({ kind: characterId === 'gojo' ? 'gojo-domain' : 'sukuna-zone', activeDuration: 4 });
      runTicks(simulation, 16);
      expect(simulation.state.areaEffects.get(area.id)?.activated).toBe(true);
    }
  });

  it('lets Dismantle reach a ranged target and Fuga release a charged mage projectile', () => {
    const slashGame = makeSimulation([
      { id: 'sukuna', name: 'Sukuna', characterId: 'sukuna', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 8 },
    ]);
    const slashTarget = slashGame.state.players.get('enemy');
    expect(slashGame.skill('sukuna', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    expect(slashTarget.hp).toBe(slashTarget.maxHp - 600);

    const flameGame = makeSimulation([{ id: 'sukuna', name: 'Sukuna', characterId: 'sukuna', x: 0, z: 0 }]);
    expect(flameGame.skill('sukuna', { skill: 2, phase: 'start', aimX: 0, aimZ: 1 })).toBe(true);
    runTicks(flameGame, 31);
    expect(flameGame.skill('sukuna', { skill: 2, phase: 'release', aimX: 0, aimZ: 1 })).toBe(true);
    const flame = [...flameGame.state.projectiles.values()][0];
    expect(flame.range).toBe(13.5);
    expect(flame.damage).toBe(1100);
    expect(flame.splashRadius).toBe(1.8);
  });

  it('gives Dusty a damage-reduced slide and a damaging close cone', () => {
    const slideGame = makeSimulation([
      { id: 'dusty', name: 'Dusty', characterId: 'dusty', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'ace', x: 0, z: 4 },
    ]);
    const dusty = slideGame.state.players.get('dusty');
    dusty.ammo = 2;
    expect(slideGame.skill('dusty', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    slideGame.tick(1 / 30);
    expect(dusty.damageReductionT).toBeGreaterThan(0);
    expect(applyDamage(slideGame.state, dusty, 1000, slideGame.state.players.get('enemy'))).toBe(750);
    runTicks(slideGame, 8);
    expect(dusty.ammo).toBe(3);

    const shellGame = makeSimulation([
      { id: 'dusty', name: 'Dusty', characterId: 'dusty', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'ace', x: 0, z: 3 },
    ]);
    const target = shellGame.state.players.get('enemy');
    expect(shellGame.skill('dusty', { skill: 2, aimX: 0, aimZ: 1 })).toBe(true);
    expect(target.hp).toBe(target.maxHp - 450);
  });

  it('lets Ace roll restore ammo and Piercing Bolt mark a hit target for defense break', () => {
    const rollGame = makeSimulation([{ id: 'ace', name: 'Ace', characterId: 'ace', x: 0, z: 0 }]);
    const ace = rollGame.state.players.get('ace');
    ace.ammo = 2;
    expect(rollGame.skill('ace', { skill: 2, aimX: 0, aimZ: 1 })).toBe(true);
    runTicks(rollGame, 10);
    expect(ace.z).toBeGreaterThan(2.8);
    expect(ace.ammo).toBe(3);

    const boltGame = makeSimulation([
      { id: 'ace', name: 'Ace', characterId: 'ace', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 5 },
    ]);
    const target = boltGame.state.players.get('enemy');
    expect(boltGame.skill('ace', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    runTicks(boltGame, 10);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(target.defenseBreakT).toBeGreaterThan(0);
  });

  it.each([
    ['dusty', 1],
    ['ace', 2],
  ])('rejects a blocked zero-length %s movement skill without restoring ammo', (characterId, skill) => {
    const collision = new MapCollision({
      minX: -10, maxX: 10, minZ: -10, maxZ: 10,
      blockers: [{ minX: 0.2, maxX: 4, minZ: -2, maxZ: 2 }],
    });
    const simulation = makeSimulation([{ id: characterId, name: characterId, characterId, x: 0, z: 0 }], collision);
    const player = simulation.state.players.get(characterId);
    player.ammo = 1;

    expect(simulation.skill(characterId, { skill, aimX: 1, aimZ: 0 })).toBe(false);
    expect(player.skillDashState).toBeNull();
    expect(player.skillCooldowns[skill - 1]).toBe(0);
    expect(player.ammo).toBe(1);
  });

  it('locks attacks, skills, Super, and Flicker for the full skill dash', () => {
    const simulation = makeSimulation([{ id: 'titan', name: 'Titan', characterId: 'titan', x: 0, z: 0 }]);
    const titan = simulation.state.players.get('titan');
    titan.superCharge = 1;

    expect(simulation.skill('titan', { skill: 1, aimX: 1, aimZ: 0 })).toBe(true);
    expect(simulation.attackStart('titan', 1, 0)).toBe(false);
    expect(simulation.skill('titan', { skill: 2, aimX: 1, aimZ: 0 })).toBe(false);
    expect(simulation.super('titan', { aimX: 1, aimZ: 0, targetX: 4, targetZ: 0 })).toBe(false);
    expect(simulation.flicker('titan', { dirX: 1, dirZ: 0 })).toBe(false);
    expect(titan.skillDashState).not.toBeNull();
    expect(titan.skillCooldowns[1]).toBe(0);
    expect(titan.superCharge).toBe(1);
    expect(titan.flickerReadyAt).toBe(30);
    runTicks(simulation, 12);
    expect(titan.skillDashState).toBeNull();
  });

  it('snapshots and deterministically replays dash movement at one fixed tick', () => {
    const simulation = makeSimulation([{ id: 'dusty', name: 'Dusty', characterId: 'dusty', x: 0, z: 0 }]);
    expect(simulation.skill('dusty', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    const snapshotPlayer = buildSnapshot(simulation).players[0];
    const input = { seq: 1, moveX: 1, moveZ: 0, aimX: 0, aimZ: 1 };
    const predicted = predictMovement(snapshotPlayer, input, 1 / 30, CHARACTER_DEFS.dusty.speed, simulation.collision);

    expect(snapshotPlayer.skillDashState).toMatchObject({ skillId: 'combat-slide', skill: 1, fromX: 0, fromZ: 0, elapsed: 0, duration: 0.25, restoreAmmo: 1 });
    simulation.setInput('dusty', input);
    simulation.tick(1 / 30);
    const player = simulation.state.players.get('dusty');
    expect(predicted.x).toBeCloseTo(player.x, 4);
    expect(predicted.z).toBeCloseTo(player.z, 4);
    expect(predicted.velX).toBeCloseTo(player.velX, 4);
    expect(predicted.velZ).toBeCloseTo(player.velZ, 4);
    expect(predicted.skillDashState.elapsed).toBeCloseTo(player.skillDashState.elapsed, 4);
  });

  it('keeps Overcharge movement and timer replay aligned with the fixed tick', () => {
    const simulation = makeSimulation([{ id: 'volt', name: 'Volt', characterId: 'volt', x: 0, z: 0 }]);
    const player = simulation.state.players.get('volt');
    player.overchargeT = 3;
    const input = { seq: 1, moveX: 1, moveZ: 0, aimX: 1, aimZ: 0 };
    const snapshotPlayer = buildSnapshot(simulation).players[0];
    const predicted = predictMovement(snapshotPlayer, input, 1 / 30, CHARACTER_DEFS.volt.speed, simulation.collision);

    simulation.setInput('volt', input);
    simulation.tick(1 / 30);
    expect(predicted.x).toBeCloseTo(player.x, 5);
    expect(predicted.velX).toBeCloseTo(player.velX, 5);
    expect(predicted.overchargeT).toBeCloseTo(player.overchargeT, 5);
    expect(player.x).toBeCloseTo(CHARACTER_DEFS.volt.speed * CHARACTER_DEFS.volt.skills[1].speedMultiplier / 30, 5);
  });

  it('lets Ace and Eagle Eye pass through one destructible cover without breaking it', () => {
    const { collision, cellsData, wallIndex } = makeCoverCollision();
    const simulation = makeSimulation([
      { id: 'ace', name: 'Ace', characterId: 'ace', x: -2, z: 0.5 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 2.5, z: 0.5 },
    ], collision);
    const target = simulation.state.players.get('enemy');
    expect(simulation.skill('ace', { skill: 1, aimX: 1, aimZ: 0 })).toBe(true);
    runTicks(simulation, 14);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(cellsData[wallIndex].kind).toBe(1);
    expect(collision.getBrokenCoverTiles()).toEqual([]);

    const archeryMap = makeCoverCollision();
    const archerGame = makeSimulation([
      { id: 'syafiah', name: 'Syafiah', characterId: 'syafiah', x: -2, z: 0.5 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 2.5, z: 0.5 },
    ], archeryMap.collision);
    const archer = archerGame.state.players.get('syafiah');
    const archeryTarget = archerGame.state.players.get('enemy');
    expect(archerGame.skill('syafiah', { skill: 1, aimX: 1, aimZ: 0 })).toBe(true);
    expect(archerGame.attackStart('syafiah', 1, 0)).toBe(true);
    runTicks(archerGame, 21);
    expect(archerGame.attackRelease('syafiah', 1, 0)).toBe(true);
    runTicks(archerGame, 10);
    expect(archeryTarget.hp).toBeLessThan(archeryTarget.maxHp);
    expect(archer.pierceCoverShots).toBe(0);
    expect(archeryMap.cellsData[archeryMap.wallIndex].kind).toBe(1);
    expect(archeryMap.collision.getBrokenCoverTiles()).toEqual([]);
  });

  it('keeps Piercing Bolt blocked by permanent rock after its one cover passage', () => {
    const { collision, cellsData, wallIndex } = makeCoverCollision({ permanentWall: true });
    const simulation = makeSimulation([
      { id: 'ace', name: 'Ace', characterId: 'ace', x: -2, z: 0.5 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 2.5, z: 0.5 },
    ], collision);
    const target = simulation.state.players.get('enemy');
    expect(simulation.skill('ace', { skill: 1, aimX: 1, aimZ: 0 })).toBe(true);
    runTicks(simulation, 14);
    expect(target.hp).toBe(target.maxHp);
    expect(cellsData[wallIndex].kind).toBe(1);
    expect(cellsData[6 * 12 + 7].style).toBe('rock');
  });

  it('sticks Fuse grenade, slows targets in Smoke Screen, and reveals the owner after firing', () => {
    const grenadeGame = makeSimulation([
      { id: 'fuse', name: 'Fuse', characterId: 'fuse', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 3.5 },
    ]);
    const enemy = grenadeGame.state.players.get('enemy');
    expect(grenadeGame.skill('fuse', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    const attachEvents = runTicks(grenadeGame, 12);
    expect(attachEvents.some((event) => event.type === 'SKILL_STICKY_ATTACH')).toBe(true);
    expect([...grenadeGame.state.projectiles.values()][0]?.stickyTargetId).toBe('enemy');
    expect(buildSnapshot(grenadeGame).projectiles[0]).toMatchObject({ stickyTargetId: 'enemy', stickyFuseRemaining: expect.any(Number) });
    expect(buildSnapshot(grenadeGame).projectiles[0].stickyFuseRemaining).toBeGreaterThan(0);
    runTicks(grenadeGame, 61);
    expect(enemy.hp).toBeLessThan(enemy.maxHp);

    const smokeGame = makeSimulation([
      { id: 'fuse', name: 'Fuse', characterId: 'fuse', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 1 },
    ]);
    const fuse = smokeGame.state.players.get('fuse');
    const slowed = smokeGame.state.players.get('enemy');
    expect(smokeGame.skill('fuse', { skill: 2, aimX: 1, aimZ: 0 })).toBe(true);
    smokeGame.tick(1 / 30);
    expect(fuse.smokeConcealed).toBe(true);
    expect(slowed.slowEffects.size).toBeGreaterThan(0);
    expect(smokeGame.attackStart('fuse', 0, 1)).toBe(true);
    smokeGame.tick(1 / 30);
    expect(fuse.smokeConcealed).toBe(false);
    expect(fuse.smokeRevealT).toBeGreaterThan(0);
  });

  it('pauses dash movement and dash hits while hard CC is active', () => {
    const simulation = makeSimulation([
      { id: 'titan', name: 'Titan', characterId: 'titan', x: -3, z: 0 },
      { id: 'target', name: 'Target', characterId: 'ace', x: -2.4, z: 0 },
      { id: 'volt', name: 'Volt', characterId: 'volt', x: -3, z: 2 },
    ]);
    const titan = simulation.state.players.get('titan');
    const target = simulation.state.players.get('target');

    expect(simulation.skill('titan', { skill: 1, aimX: 1, aimZ: 0 })).toBe(true);
    expect(simulation.skill('volt', { skill: 1, aimX: 0, aimZ: -1 })).toBe(true);
    expect(titan.hardCCT).toBeGreaterThan(0);
    const targetHpBeforePause = target.hp;
    for (let index = 0; index < 5; index += 1) simulation.tick(1 / 30);
    expect(titan.skillDashState.elapsed).toBe(0);
    expect(target.hp).toBe(targetHpBeforePause);

    simulation.tick(1 / 30);
    expect(titan.skillDashState.elapsed).toBeGreaterThan(0);
    expect(target.hp).toBeLessThan(targetHpBeforePause);
  });

  it('does not advance or resolve dash hits while its owner or target is airborne', () => {
    const ownerAirborne = makeSimulation([
      { id: 'titan', name: 'Titan', characterId: 'titan', x: -3, z: 0 },
      { id: 'target', name: 'Target', characterId: 'ace', x: -2.4, z: 0 },
    ]);
    const titan = ownerAirborne.state.players.get('titan');
    const target = ownerAirborne.state.players.get('target');
    expect(ownerAirborne.skill('titan', { skill: 1, aimX: 1, aimZ: 0 })).toBe(true);
    titan.airborneT = 1;
    ownerAirborne.tick(1 / 30);
    expect(titan.skillDashState.elapsed).toBe(0);
    expect(target.hp).toBe(target.maxHp);
    titan.airborneT = 0;
    ownerAirborne.tick(1 / 30);
    expect(titan.skillDashState.elapsed).toBeGreaterThan(0);
    expect(target.hp).toBeLessThan(target.maxHp);

    const targetAirborne = makeSimulation([
      { id: 'titan', name: 'Titan', characterId: 'titan', x: 0, z: 0 },
      { id: 'target', name: 'Target', characterId: 'ace', x: 0, z: 0.5 },
    ]);
    const airborneTarget = targetAirborne.state.players.get('target');
    airborneTarget.airborneT = 1;
    expect(targetAirborne.skill('titan', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    runTicks(targetAirborne, 12);
    expect(airborneTarget.hp).toBe(airborneTarget.maxHp);
    expect(targetAirborne.state.players.get('titan').skillDashState).toBeNull();
  });

  it('lets Titan charge through a target and Taunt Echo mitigate damage and slow retreat', () => {
    const chargeGame = makeSimulation([
      { id: 'titan', name: 'Titan', characterId: 'titan', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 2 },
    ]);
    const chargeTarget = chargeGame.state.players.get('enemy');
    expect(chargeGame.skill('titan', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    runTicks(chargeGame, 12);
    expect(chargeTarget.hp).toBeLessThan(chargeTarget.maxHp);

    const tauntGame = makeSimulation([
      { id: 'titan', name: 'Titan', characterId: 'titan', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 2 },
    ]);
    const titan = tauntGame.state.players.get('titan');
    const retreating = tauntGame.state.players.get('enemy');
    retreating.input.moveZ = 1;
    expect(tauntGame.skill('titan', { skill: 2, aimX: 0, aimZ: 1 })).toBe(true);
    tauntGame.tick(1 / 30);
    expect(applyDamage(tauntGame.state, titan, 1000, retreating)).toBe(700);
    expect([...retreating.slowEffects.values()].some((effect) => effect.multiplier === 0.7)).toBe(true);
  });

  it('chains Volt lightning across three targets and expands Overcharge volleys', () => {
    const chainGame = makeSimulation([
      { id: 'volt', name: 'Volt', characterId: 'volt', x: 0, z: 0 },
      { id: 'first', name: 'First', characterId: 'dusty', x: 0, z: 4 },
      { id: 'second', name: 'Second', characterId: 'dusty', x: 0, z: 6 },
      { id: 'third', name: 'Third', characterId: 'dusty', x: 0, z: 7.5 },
    ]);
    const chainEvents = chainGame.skill('volt', { skill: 1, aimX: 0, aimZ: 1 });
    expect(chainEvents).toBe(true);
    expect(chainGame.state.players.get('first').hp).toBe(3550);
    expect(chainGame.state.players.get('second').hp).toBe(3650);
    expect(chainGame.state.players.get('third').hp).toBe(3650);
    expect(chainGame.state.events.filter((event) => event.type === 'SKILL_CHAIN_HIT')).toHaveLength(3);

    const overchargeGame = makeSimulation([{ id: 'volt', name: 'Volt', characterId: 'volt', x: 0, z: 0 }]);
    const volt = overchargeGame.state.players.get('volt');
    expect(overchargeGame.skill('volt', { skill: 2, aimX: 1, aimZ: 0 })).toBe(true);
    expect(volt.overchargeT).toBe(3);
    expect(overchargeGame.attackStart('volt', 1, 0)).toBe(true);
    overchargeGame.tick(1 / 30);
    expect(volt.burstState.remaining).toBe(3);
  });

  it('breaks Naka stealth on attack and Super and opens the Kunai recast dash after a hit', () => {
    const stealthGame = makeSimulation([{ id: 'naka', name: 'Naka', characterId: 'naka', x: 0, z: 0 }]);
    const naka = stealthGame.state.players.get('naka');
    expect(stealthGame.skill('naka', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    expect(naka.stealthT).toBe(2);
    expect(stealthGame.attackStart('naka', 0, 1)).toBe(true);
    expect(naka.stealthT).toBe(0);
    naka.stealthT = 2;
    naka.superCharge = 1;
    expect(stealthGame.super('naka', { aimX: 1, aimZ: 0, targetX: 4, targetZ: 0 })).toBe(true);
    expect(naka.stealthT).toBe(0);

    const kunaiGame = makeSimulation([
      { id: 'naka', name: 'Naka', characterId: 'naka', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 4 },
    ]);
    const kunaiEvents = [];
    expect(kunaiGame.skill('naka', { skill: 2, aimX: 0, aimZ: 1 })).toBe(true);
    kunaiEvents.push(...runTicks(kunaiGame, 7));
    expect(kunaiEvents.some((event) => event.type === 'KUNAI_RECAST_READY')).toBe(true);
    const kunaiOwner = kunaiGame.state.players.get('naka');
    expect(kunaiOwner.kunaiRecastTargetId).toBe('enemy');
    kunaiOwner.stealthT = 1;
    expect(kunaiGame.skill('naka', { skill: 2, aimX: 0, aimZ: 1 })).toBe(true);
    expect(kunaiOwner.stealthT).toBe(0);
    expect(kunaiOwner.skillDashState.skillId).toBe('kunai-recast');
  });

  it('parries a projectile by its travel direction after the attacker moves', () => {
    const simulation = makeSimulation([
      { id: 'attacker', name: 'Attacker', characterId: 'fuse', x: 0, z: 0 },
      { id: 'defender', name: 'Defender', characterId: 'ello', x: 0, z: 1.5 },
    ]);
    const attacker = simulation.state.players.get('attacker');
    const defender = simulation.state.players.get('defender');

    expect(simulation.skill('defender', { skill: 1, aimX: 0, aimZ: -1 })).toBe(true);
    expect(simulation.attackStart('attacker', 0, 1)).toBe(true);
    attacker.x = 8;
    const events = runTicks(simulation, 10);
    expect(events.some((event) => event.type === 'SKILL_PARRY' && event.ownerId === 'defender')).toBe(true);
    expect(defender.hp).toBe(defender.maxHp);
    expect(defender.skillParryT).toBe(0);
  });

  it('makes Ello Parry Stance block one frontal hit, empower Iaido, and keeps Swift Flash active', () => {
    const parryGame = makeSimulation([
      { id: 'ello', name: 'Ello', characterId: 'ello', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 2 },
    ]);
    const ello = parryGame.state.players.get('ello');
    const enemy = parryGame.state.players.get('enemy');
    expect(parryGame.skill('ello', { skill: 1, aimX: 0, aimZ: 1 })).toBe(true);
    expect(applyDamage(parryGame.state, ello, 500, enemy)).toBe(0);
    expect(ello.skillParryT).toBe(0);
    expect(ello.parryEmpowerT).toBe(2);
    expect(ello.lastDamageBlocked).toBe(true);

    const flashGame = makeSimulation([
      { id: 'ello', name: 'Ello', characterId: 'ello', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 2 },
    ]);
    const flashOwner = flashGame.state.players.get('ello');
    const flashTarget = flashGame.state.players.get('enemy');
    expect(flashGame.skill('ello', { skill: 2, aimX: 0, aimZ: 1 })).toBe(true);
    expect(flashOwner.ccImmuneT).toBeGreaterThan(0);
    runTicks(flashGame, 10);
    expect(flashTarget.hp).toBeLessThan(flashTarget.maxHp);
  });

  it('sets Syafiah caltrops at the origin and triggers slow and damage on contact', () => {
    const simulation = makeSimulation([
      { id: 'syafiah', name: 'Syafiah', characterId: 'syafiah', x: 0, z: 0 },
      { id: 'enemy', name: 'Enemy', characterId: 'dusty', x: 0, z: 0.6 },
    ]);
    const target = simulation.state.players.get('enemy');
    expect(simulation.skill('syafiah', { skill: 2, aimX: 0, aimZ: 1 })).toBe(true);
    expect(simulation.state.skillTraps.size).toBe(1);
    runTicks(simulation, 2);
    expect(simulation.state.skillTraps.size).toBe(0);
    expect(target.slowEffects.has('caltrops:syafiah')).toBe(true);
    expect(target.bleeds.has('caltrops:syafiah')).toBe(true);
  });
});
