import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CHARACTER_DEFS } from '../shared/data/characters.js';

const context = vm.createContext({ console, URLSearchParams });
context.window = context;
context.performance = performance;
context.document = { hidden: false };
context.devicePixelRatio = 3;
context.matchMedia = query => ({ matches: query === '(pointer: coarse)' });
const load = (file) => vm.runInContext(readFileSync(new URL(`../public/engine/${file}.js`, import.meta.url), 'utf8'), context, { filename: file });
load('three-legacy');
load('render-pipeline');
const hdPipeline = Object.create(context.Zc.prototype);
Object.assign(hdPipeline, {
  superSample: 0, quality: context.Uc.low, performanceScale: 0.6,
  maxPixelsCoarse: 1_000_000, maxPixelsFine: 5_000_000,
});
assert.ok(hdPipeline.getPixelRatio(800, 360) >= 2, 'adaptive scaling preserves at least an HD landscape buffer when the device can render it');
const original = JSON.parse(JSON.stringify(context.Bc));
load('character-roster');
load('world');
let finishGPUWork;
let gpuResourceDisposed = false;
context.window.__GBH_RENDERER__ = {
  kind: 'webgpu',
  renderer: { backend: { device: { queue: { onSubmittedWorkDone: () => new Promise(resolve => { finishGPUWork = resolve; }) } } } },
};
context.disposeRendererResources([{ dispose() { gpuResourceDisposed = true; } }]);
assert.equal(gpuResourceDisposed, false, 'WebGPU resources stay alive until submitted commands finish');
finishGPUWork();
await Promise.resolve();
assert.equal(gpuResourceDisposed, true, 'WebGPU resources are disposed after the queue fence resolves');
context.window.__GBH_RENDERER__ = undefined;
load('character-models');
load('sorcerer-models');
load('brawlers');
context.MATCH_MODES = { classic: { label: 'Classic', bots: 7, targetKills: 0, timeLimit: 205, powerUpCap: 10 } };
context.window.claude = { hot: { ready() {} } };
load('main');
load('combat');
load('effects');
load('interfaces');
const characterIds = Object.keys(context.Bc);
for (const id of characterIds) {
  assert.deepEqual(JSON.parse(JSON.stringify(context.Bc[id].skills)), CHARACTER_DEFS[id].skills, `${id}: solo and multiplayer skills match`);
}
for (const id of ['gojo', 'sukuna']) {
  const solo = context.Bc[id];
  const shared = CHARACTER_DEFS[id];
  assert.equal(solo.name, shared.name, `${id}: solo and multiplayer names match`);
  assert.equal(solo.hp, shared.maxHp, `${id}: solo and multiplayer health match`);
  assert.equal(solo.speed, shared.speed, `${id}: solo and multiplayer movement speed match`);
  assert.equal(solo.reload, shared.reload, `${id}: solo and multiplayer reload match`);
  assert.equal(solo.superCharge, shared.superCharge, `${id}: solo and multiplayer Super charge match`);
  assert.deepEqual(JSON.parse(JSON.stringify(solo.attack)), shared.attack, `${id}: solo and multiplayer basic attack match`);
  assert.deepEqual(JSON.parse(JSON.stringify(solo.skills)), shared.skills, `${id}: solo and multiplayer skills match`);
  const { cooldown: _cooldown, ...sharedSuper } = shared.super;
  assert.deepEqual(JSON.parse(JSON.stringify(solo.super)), sharedSuper, `${id}: solo and multiplayer Super match`);
}
assert.deepEqual(Array.from(context.Bc.gojo.skills, skill => skill.name), [
  'Cursed Technique Lapse - Blue', 'Cursed Technique Reversal - Red',
], 'Gojo keeps the requested skill names');
assert.deepEqual(Array.from(context.Bc.sukuna.skills, skill => skill.name), [
  'Dismantle', 'Fuga - Kamino / Flame Arrow',
], 'Sukuna keeps the requested skill names');

let verifiedSoloSkillCount = 0;
function makeSoloSkillHarness(characterId, targetZ = 4) {
  const effectCalls = [];
  const effects = new Proxy({}, { get: (_target, name) => (..._args) => effectCalls.push(String(name)) });
  const game = {
    scene: new context.vt(),
    elapsed: 1,
    matchTime: 1,
    state: 'playing',
    effects,
    audio: { play() {} },
    hud: { floatText() {}, toast() {} },
    world: {
      raycast() { return null; },
      hasLineOfSight() { return true; },
      resolveCircle(point) { return point; },
      surfaceAt() { return null; },
      toTile() { return 0; },
      center() { return 0; },
      destroyTile() { return null; },
    },
    brawlers: [],
  };
  const geometry = () => new context.fr(0.4, 0.1, 0.4);
  const material = color => new context.Nr({ color, transparent: true, opacity: 0.6 });
  const combat = Object.create(context.Su.prototype);
  Object.assign(combat, {
    game,
    characterAreas: [],
    characterTraps: [],
    characterProjectiles: [],
    arrowShowers: [],
    arrowShowerDiscGeometry: geometry(),
    arrowShowerRingGeometry: geometry(),
    arrowShowerDiscMaterial: material(0xffd17a),
    arrowShowerRingMaterial: material(0xffe5a5),
    characterAreaOrbGeometry: geometry(),
    trapDiscGeometry: geometry(),
    trapRingGeometry: geometry(),
    trapSpikeGeometry: geometry(),
    caltropDiscMaterial: material(0x8c784d),
    caltropRingMaterial: material(0xd1bd87),
    shrineMaterials: {
      wood: material(0x4b2028), red: material(0x9b2937),
      roof: material(0x201b29), gold: material(0xc29346), trap: material(0xb9a77c),
    },
  });
  game.combat = combat;

  const owner = new context.fu(game, context.Bc[characterId], {
    x: 0, z: 0, isPlayer: true, name: `Solo ${characterId}`,
  });
  owner.id = `solo-${characterId}`;
  owner.alive = true;
  owner.spawnT = 0;
  owner.hardCCT = 0;
  owner.cubes = 0;
  owner.canAct = () => true;
  const target = {
    id: 'solo-skill-target', x: 0, z: targetZ, facing: 0, alive: true, airborne: false,
    hp: 10000, maxHp: 10000, hardCCT: 0, lastDamageBlocked: false,
    root: { position: new context.H(0, 0, targetZ) },
    knock: { set() {} }, slowEffects: new Map(), bleeds: new Map(), burns: new Map(),
    takeDamage(amount) {
      const dealt = Math.min(this.hp, amount);
      this.hp -= dealt;
      this.lastDamageBlocked = false;
      if (this.hp <= 0) this.alive = false;
      return dealt;
    },
    applyHardCC(duration) { this.hardCCT = Math.max(this.hardCCT, duration); },
    applyStatusDoT(kind, source, damage, duration) {
      (kind === 'burn' ? this.burns : this.bleeds).set(source.id, { damage, duration });
    },
  };
  game.brawlers = [owner, target];
  return { game, combat, owner, target, effectCalls };
}

function invokeSoloSkill(characterId, skillNumber, targetZ = 4) {
  const harness = makeSoloSkillHarness(characterId, targetZ);
  const definition = context.Bc[characterId].skills[skillNumber - 1];
  assert.equal(harness.owner.useSkill(skillNumber, 'activate', 0, 1, 0, targetZ), true, `${characterId} skill ${skillNumber} activates in solo`);
  assert.equal(harness.owner.skillCooldowns[skillNumber - 1], definition.cooldown, `${characterId} skill ${skillNumber} starts its solo cooldown`);
  verifiedSoloSkillCount += 1;
  return harness;
}

const soloSlide = invokeSoloSkill('dusty', 1);
assert.equal(soloSlide.owner.dash.attack.skillId, 'combat-slide');
assert.equal(soloSlide.owner.damageReduction, 0.25);
const soloShell = invokeSoloSkill('dusty', 2, 3);
assert.equal(soloShell.target.hp, soloShell.target.maxHp - 450);

const soloBolt = invokeSoloSkill('ace', 1);
assert.equal(soloBolt.combat.characterProjectiles[0].pierceCoverRemaining, 1);
assert.equal(soloBolt.combat.characterProjectiles[0].damage, 480);
const soloRoll = invokeSoloSkill('ace', 2);
assert.equal(soloRoll.owner.dash.attack.skillId, 'tactical-roll');

const soloSticky = invokeSoloSkill('fuse', 1);
assert.equal(soloSticky.combat.characterProjectiles[0].stickyFuse, 2);
assert.equal(soloSticky.combat.characterProjectiles[0].attachToTarget, true);
const soloSmoke = invokeSoloSkill('fuse', 2);
assert.equal(soloSmoke.combat.characterAreas[0].kind, 'smoke-screen');
assert.equal(soloSmoke.combat.characterAreas[0].attack.duration, 3.5);

const soloCharge = invokeSoloSkill('titan', 1);
assert.equal(soloCharge.owner.dash.attack.skillId, 'iron-charge');
const soloTaunt = invokeSoloSkill('titan', 2);
assert.equal(soloTaunt.owner.tauntEchoT, 1.75);
assert.equal(soloTaunt.owner.damageReduction, 0.3);

const soloChain = invokeSoloSkill('volt', 1);
assert.equal(soloChain.target.hp, soloChain.target.maxHp - 350);
const soloOvercharge = invokeSoloSkill('volt', 2);
assert.equal(soloOvercharge.owner.overchargeT, 3);

const soloSmokeBomb = invokeSoloSkill('naka', 1);
assert.equal(soloSmokeBomb.owner.stealthT, 2);
const soloKunai = invokeSoloSkill('naka', 2);
assert.equal(soloKunai.combat.characterProjectiles[0].skillId, 'kunai-dash');
soloKunai.owner.kunaiRecastTarget = soloKunai.target;
soloKunai.owner.kunaiRecastUntil = soloKunai.game.matchTime + 2;
assert.equal(soloKunai.owner.useSkill(2, 'activate', 0, 1, 0, 4), true, 'solo Kunai can be recast after a hit');
assert.equal(soloKunai.owner.dash.attack.skillId, 'kunai-recast');

const soloParrySkill = invokeSoloSkill('ello', 1);
assert.equal(soloParrySkill.owner.takeDamage(500, soloParrySkill.target, false, { kind: 'melee' }), 0);
assert.equal(soloParrySkill.owner.parryEmpowerT, 2);
const soloFlash = invokeSoloSkill('ello', 2);
assert.equal(soloFlash.owner.dash.attack.skillId, 'swift-flash');
assert.ok(soloFlash.owner.ccImmuneT > 0);

const soloEagle = invokeSoloSkill('syafiah', 1);
assert.equal(soloEagle.owner.pierceCoverShots, 1);
const soloCaltrops = invokeSoloSkill('syafiah', 2);
assert.equal(soloCaltrops.combat.characterTraps.length, 1);
assert.equal(soloCaltrops.owner.dash.attack.skillId, 'caltrops-trap');

const soloBlue = invokeSoloSkill('gojo', 1);
assert.equal(soloBlue.combat.characterAreas[0].kind, 'gojo-pull');
assert.equal(soloBlue.combat.characterAreas[0].activeRemaining, 2.4);
assert.ok(soloBlue.combat.characterAreas[0].orb, 'solo Blue creates its orb visual');
const soloRed = invokeSoloSkill('gojo', 2);
assert.equal(soloRed.target.hp, soloRed.target.maxHp - 700);

const soloDismantle = invokeSoloSkill('sukuna', 1);
assert.equal(soloDismantle.target.hp, soloDismantle.target.maxHp - 600);
const soloFuga = makeSoloSkillHarness('sukuna');
assert.equal(soloFuga.owner.useSkill(2, 'start', 0, 1, 0, 4), true);
soloFuga.game.matchTime += 1.1;
assert.equal(soloFuga.owner.useSkill(2, 'release', 0, 1, 0, 4), true);
assert.equal(soloFuga.combat.characterProjectiles[0].damage, 1100);
assert.equal(soloFuga.combat.characterProjectiles[0].range, 13.5);
verifiedSoloSkillCount += 1;
assert.equal(verifiedSoloSkillCount, 20, 'the verifier exercises both active-skill paths for all ten characters in solo');

const soloBarrier = makeSoloSkillHarness('gojo');
soloBarrier.owner.gojoBarrier = true;
assert.equal(soloBarrier.owner.takeDamage(500, soloBarrier.target, false, { kind: 'melee' }), 0);
assert.equal(soloBarrier.owner.gojoBarrier, false);
assert.equal(soloBarrier.owner.gojoBarrierReadyAt, soloBarrier.game.matchTime + 5);

for (const [characterId, expectedKind] of [['gojo', 'gojo-domain'], ['sukuna', 'sukuna-zone']]) {
  const soloSuper = makeSoloSkillHarness(characterId);
  soloSuper.owner.superCharge = 1;
  assert.equal(soloSuper.owner.useSuper(0, 1, 0, 4), true, `${characterId} Super activates in solo`);
  const area = soloSuper.combat.characterAreas[0];
  assert.equal(area.kind, expectedKind);
  assert.equal(area.attack.duration, 4);
  if (characterId === 'gojo') assert.equal(soloSuper.effectCalls.filter(name => name === 'spark').length, 10, 'solo Gojo Super emits its particle ring');
  else assert.equal(area.shrine?.name, 'malevolent-shrine', 'solo Sukuna Super builds the shrine visual');
}

const botRoster = Array.from(context.createBalancedBotRoster(characterIds, 15, 0x13579bdf));
assert.equal(botRoster.length, 15, 'solo Deathmatch roster fills all bot slots');
assert.deepEqual(Array.from(context.createBalancedBotRoster(characterIds, 15, 0x13579bdf)), botRoster, 'same seed keeps bot roster deterministic');
for (const characterId of characterIds) {
  assert.ok(botRoster.filter(id => id === characterId).length <= 2, `${characterId}: at most two Deathmatch bots`);
  assert.ok(botRoster.includes(characterId), `${characterId}: every Deathmatch bot lineup includes this character before repeats`);
}
for (let seed = -32; seed <= 32; seed += 1) {
  const seededRoster = context.createBalancedBotRoster(characterIds, 15, seed);
  for (const characterId of characterIds) {
    assert.ok(seededRoster.filter(id => id === characterId).length <= 2, `${characterId}: roster seed ${seed} stays under the bot cap`);
    assert.ok(seededRoster.includes(characterId), `${characterId}: roster seed ${seed} includes every character before repeats`);
  }
}

assert.equal(context.getBotTargetScore('deathmatch', 8, 0.1, false), 8, 'Deathmatch bot targeting uses distance only');
assert.equal(context.getBotTargetScore('deathmatch', 8, 0.9, true), 8, 'Deathmatch bots do not favor low-health or recent-attacker targets');
assert.ok(
  context.getBotTargetScore('classic', 8, 1, true) < context.getBotTargetScore('classic', 8, 1, false),
  'non-Deathmatch bot aggression keeps its existing retaliation preference',
);

const aimGame = Object.create(context.ld.prototype);
const aimPlayer = { x: 0, z: 0, facing: 0 };
const attackRange = context.Bc.dusty.attack.range;
const nearbyOpponent = {
  x: 0, z: attackRange * 1.05 + 1, alive: true, hidden: false, airborne: false,
  vel: { x: 0, y: 0 },
};
const aimBox = { x: 3, z: 0, alive: true };
Object.assign(aimGame, {
  player: aimPlayer,
  brawlers: [aimPlayer, nearbyOpponent],
  combat: { boxes: [aimBox] },
  world: { hasLineOfSight: () => true },
});
let targetAim = aimGame.autoAim(context.Bc.dusty.attack);
assert.ok(targetAim.dz > 0.98, 'auto-aim keeps a nearby opponent ahead of an in-range item box');
nearbyOpponent.z = attackRange * 1.05 + Math.min(3, Math.max(1.5, attackRange * 0.15)) + 1;
targetAim = aimGame.autoAim(context.Bc.dusty.attack);
assert.ok(targetAim.dx > 0.98, 'auto-aim falls back to an item box when no opponent is nearby');

function makeAdaptiveQualityHarness(qualityName, userPickedQuality) {
  const calls = { quality: [], effects: [], scale: [] };
  const game = Object.create(context.ld.prototype);
  Object.assign(game, {
    state: 'playing', paused: false, userPickedQuality,
    pipeline: {
      qualityName, performanceScale: 1, isWebGPU: true,
      setPerformanceScale(scale) { calls.scale.push(scale); return true; },
    },
    perf: { t: 0, frames: 0, lowFpsWindows: 0, stableFpsWindows: 0 },
    setQuality(nextQuality) { calls.quality.push(nextQuality); this.pipeline.qualityName = nextQuality; },
    setPerformanceEffectsReduced(reduced) { calls.effects.push(reduced); },
  });
  return { game, calls };
}
function feedAdaptiveWindow(game, fps, seconds) {
  game.perf.t = seconds - 1 / fps;
  game.perf.frames = Math.round(fps * seconds) - 1;
  game.adaptQuality(1 / fps);
}
const lowQualityAdaptive = makeAdaptiveQualityHarness('low', false);
feedAdaptiveWindow(lowQualityAdaptive.game, 59, 6);
assert.deepEqual(lowQualityAdaptive.calls, { quality: [], effects: [], scale: [] }, 'one short low-FPS window does not alter quality or resolution');
feedAdaptiveWindow(lowQualityAdaptive.game, 59, 6);
assert.deepEqual(lowQualityAdaptive.calls, { quality: [], effects: [true], scale: [] }, 'sustained low FPS reduces optional effects without lowering Low resolution');
feedAdaptiveWindow(lowQualityAdaptive.game, 70, 6);
feedAdaptiveWindow(lowQualityAdaptive.game, 70, 6);
assert.deepEqual(lowQualityAdaptive.calls.effects, [true, false], 'effects restore after sustained stable FPS');
const highQualityAdaptive = makeAdaptiveQualityHarness('high', true);
feedAdaptiveWindow(highQualityAdaptive.game, 30, 3);
assert.deepEqual(highQualityAdaptive.calls, { quality: ['medium'], effects: [true], scale: [] }, 'High switches to Medium at 30 FPS without dynamic resolution drops');

const effectSettingHarness = Object.create(context.ld.prototype);
const performanceReductions = [];
Object.assign(effectSettingHarness, {
  performanceEffectsReduced: false,
  mobileDefaultQuality: false,
  lowEndDevice: false,
  pipeline: { isWebGPU: false, quality: { lampShadows: true }, requestShadowUpdate() {} },
  lighting: { key: {}, lampSlots: [{}, {}], lampShadowSlots: 1 },
  effects: { setPerformanceReduced(reduced) { performanceReductions.push(reduced); } },
});
effectSettingHarness.setPerformanceEffectsReduced(true);
assert.equal(effectSettingHarness.lighting.key.castShadow, false, 'adaptive pressure disables the directional shadow');
assert.deepEqual(effectSettingHarness.lighting.lampSlots.map(light => light.castShadow), [false, false], 'adaptive pressure disables lamp shadows');
effectSettingHarness.setPerformanceEffectsReduced(false);
assert.equal(effectSettingHarness.lighting.key.castShadow, true, 'stable performance restores the directional shadow');
assert.deepEqual(effectSettingHarness.lighting.lampSlots.map(light => light.castShadow), [true, false], 'stable performance restores only configured lamp shadows');
assert.deepEqual(performanceReductions, [true, false], 'particle effects follow the adaptive performance mode');

const particleQualityCalls = [];
const particleEffectHarness = Object.create(context.Nu.prototype);
Object.assign(particleEffectHarness, {
  qualityTier: 0, performanceReduced: false, debrisCap: 140, debrisActiveCap: 140, debrisCursor: 0,
  glow: { setQuality(scale) { particleQualityCalls.push(['glow', scale]); } },
  smoke: { setQuality(scale) { particleQualityCalls.push(['smoke', scale]); } },
  debrisData: Array.from({ length: 140 }, () => ({ life: 1 })),
  debrisMesh: { setMatrixAt() {}, instanceMatrix: {} },
});
particleEffectHarness.setQuality(0);
const baseDebrisCap = particleEffectHarness.debrisActiveCap;
particleEffectHarness.setPerformanceReduced(true);
assert.ok(particleEffectHarness.glow && particleEffectHarness.performanceReduced, 'adaptive particle mode is active');
assert.ok(particleEffectHarness.debrisActiveCap < baseDebrisCap, 'adaptive particle mode lowers the debris cap');
assert.equal(particleQualityCalls.at(-2)[1], 0.275, 'adaptive particle mode halves the Low glow budget');
particleEffectHarness.setPerformanceReduced(false);
assert.equal(particleEffectHarness.debrisActiveCap, baseDebrisCap, 'particle capacity restores with stable performance');

const soloRespawnTarget = {
  alive: false, deadT: 5, hp: 0, maxHp: context.Bc.dusty.hp, def: context.Bc.dusty,
  cubes: 4, ammo: 0, maxAmmo: 3, superCharge: 0.73,
  slowEffects: new Map(), bleeds: new Map(), burns: new Map(), sukunaBasicHits: new Map(), scatterHits: new Map(),
  vel: { set() {} }, knock: { set() {} }, superRing: { material: { opacity: 1 }, visible: true },
  root: { position: { set() {} }, rotation: { set() {} }, scale: { setScalar() {} }, visible: false },
};
const soloRespawnGame = Object.create(context.ld.prototype);
Object.assign(soloRespawnGame, {
  modeName: 'deathmatch', state: 'playing', matchTime: 10, elapsed: 10,
  mode: { spawnProtection: 2 }, world: { spawns: [[0, 0]], center: value => value, isBushAt: () => false },
  brawlers: [soloRespawnTarget], brains: [],
});
soloRespawnGame.respawnBrawler(soloRespawnTarget);
assert.equal(soloRespawnTarget.superCharge, 0.73, 'solo Deathmatch respawn preserves Super charge');

const soloBrawler = Object.create(context.fu.prototype);
Object.assign(soloBrawler, {
  alive: true, hardCCT: 0, heldItems: ['shield', 'heal'], heldItem: 'shield', shieldT: 0, itemSpeedT: 0,
  hp: 500, maxHp: 1000, def: context.Bc.dusty, superCharge: 0, hidden: false, isPlayer: false,
  root: { position: { x: 0, z: 0 }, rotation: { y: 0 } }, squash: 0, flickerReadyAt: 30,
  game: {
    matchTime: 12, state: 'playing', world: { raycast: () => null },
    effects: { burst() {}, healPuff() {}, dust() {} },
    audio: { play() {} },
    hud: { floatText() {}, toast() {} },
  },
});
assert.equal(soloBrawler.flickerRemaining, 30 - soloBrawler.game.matchTime, 'solo Flicker reports its remaining cooldown');
assert.equal(soloBrawler.flickerReady, false);
soloBrawler.game.matchTime = 30;
assert.equal(soloBrawler.flickerReady, true, 'solo Flicker becomes ready at the cooldown boundary');
soloBrawler.spawnT = 1;
assert.equal(soloBrawler.useFlicker(1, 0), false, 'solo Flicker respects respawn protection');
soloBrawler.spawnT = 0;
assert.equal(soloBrawler.useFlicker(1, 0), true, 'solo Flicker can be used once cooldown and protection end');
assert.equal(soloBrawler.useHeldItem(1), true, 'solo player can use Item 2');
assert.deepEqual(Array.from(soloBrawler.heldItems), ['shield', null], 'using Item 2 preserves Item 1');
assert.ok(soloBrawler.hp > 500, 'solo healing item applies its effect');
assert.equal(soloBrawler.useHeldItem(0), true, 'solo player can use Item 1 afterward');
assert.equal(soloBrawler.shieldT, 3, 'solo shield item applies its effect');
assert.deepEqual(Array.from(soloBrawler.heldItems), [null, null]);

function makeSoloTrapHarness(kind) {
  const randomValues = [kind === 'explosion' ? 0.1 : kind === 'burning' ? 0.5 : 0.9, 0.5, 0.5];
  const damages = [];
  const brawler = {
    alive: true, x: 0, z: 0,
    takeDamage(amount, attacker, silent, context) { damages.push({ amount, attacker, silent, context }); },
  };
  const game = Object.create(context.ld.prototype);
  Object.assign(game, {
    state: 'playing', matchTime: 60, elapsed: 60, nextTrapAt: 60, nextTrapId: 1,
    timedTraps: new Map(), brawlers: [brawler],
    world: { seed: 23, isWalkable: () => true, center: () => 0, hazardDamageAt: () => 0 },
    scene: { add() {}, remove() {} },
    effects: { explosion() {} }, hud: { banner() {} }, shake() {},
    nextTimedTrapRandom() { return randomValues.shift() ?? 0.5; },
  });
  game.updateTimedTraps(1);
  assert.equal(game.timedTraps.size, 1, `${kind}: solo red zone starts at 60 seconds`);
  assert.equal([...game.timedTraps.values()][0].phase, 'warning', `${kind}: solo trap begins with a warning`);
  for (let second = 0; second < 5; second += 1) {
    game.matchTime += 1;
    game.elapsed += 1;
    game.updateTimedTraps(1);
  }
  return { game, brawler, damages };
}

for (const [kind, expectedDamage] of [['explosion', 1450], ['burning', 240], ['poison', 190]]) {
  const { game, damages } = makeSoloTrapHarness(kind);
  assert.equal(damages[0]?.amount, expectedDamage, `${kind}: solo trap applies the expected damage`);
  assert.equal(damages[0]?.attacker, null, `${kind}: solo trap has no player kill attribution`);
  if (kind === 'explosion') {
    assert.equal(game.timedTraps.size, 0, 'solo explosion clears after detonating');
    game.matchTime = 120;
    game.elapsed = 120;
    game.updateTimedTraps(0);
    assert.equal(game.timedTraps.size, 1, 'solo red zone repeats 60 seconds later');
  } else assert.equal([...game.timedTraps.values()][0]?.phase, 'active', `${kind}: area remains active after its warning`);
}

let localNetworkTrapRandomCalls = 0;
const networkTrapClient = Object.create(context.ld.prototype);
Object.assign(networkTrapClient, {
  networkSession: {}, state: 'playing', matchTime: 60, nextTrapAt: 60,
  timedTraps: new Map(),
  nextTimedTrapRandom() { localNetworkTrapRandomCalls += 1; return 0.5; },
});
networkTrapClient.updateTimedTraps(1);
assert.equal(networkTrapClient.timedTraps.size, 0, 'multiplayer clients never create local authoritative traps');
assert.equal(localNetworkTrapRandomCalls, 0, 'multiplayer clients only receive trap selection from the server');

// Automatic adaptation keeps user-selected Ultra and only applies the requested High threshold.
context.document = { hidden: false };
const qualityChanges = [];
const qualityGame = Object.create(context.ld.prototype);
Object.assign(qualityGame, {
  state: 'playing', paused: false, userPickedQuality: true,
  perf: { t: 0, frames: 0 }, pipeline: { qualityName: 'ultra' },
  hud: { toast() {} },
  setQuality(name) { qualityChanges.push(name); this.pipeline.qualityName = name; },
});
for (let frame = 0; frame < 15; frame++) qualityGame.adaptQuality(0.2);
assert.deepEqual(qualityChanges, [], 'manual Ultra is not force-downgraded by the generic low-FPS fallback');
assert.ok(context.Uc.high.shadowMap < 4096 && context.Uc.ultra.lampMap < 2048, 'High/Ultra cap expensive shadow targets');
const webGpuShadowWrites = [];
const webGpuPoolLightCounts = [];
const webGpuQuality = {
  pipeline: { isWebGPU: true, usingPCSS: false },
  mapSize: 2048,
  key: { castShadow: true, shadow: { mapSize: { x: 2048, set(x, y) { webGpuShadowWrites.push(['sun', x, y]); this.x = x; } }, radius: 0 } },
  lampShadowSlots: 4,
  lampSlots: Array.from({ length: 8 }, () => ({
    castShadow: true,
    shadow: { mapSize: { x: 1024, set(x, y) { webGpuShadowWrites.push(['lamp', x, y]); this.x = x; } }, radius: 0 },
  })),
  setPoolSize(count) { webGpuPoolLightCounts.push(count); },
  invalidateShadowMap() {},
  updateShadowParams() {},
};
context.kl.prototype.applyQuality.call(webGpuQuality, context.Uc.low);
assert.equal(webGpuQuality.mapSize, 2048, 'WebGPU uses a stable 2K sun shadow target at startup');
assert.deepEqual(webGpuShadowWrites, [], 'WebGPU initializes its sun shadow target before the first frame');
assert.equal(webGpuQuality.key.castShadow, false, 'WebGPU keeps directional shadows disabled across quality tiers');
assert.ok(webGpuQuality.lampSlots.every(light => light.castShadow === false), 'WebGPU keeps lamp shadows disabled across quality tiers');
for (const quality of ['medium', 'high', 'ultra']) context.kl.prototype.applyQuality.call(webGpuQuality, context.Uc[quality]);
assert.deepEqual(webGpuShadowWrites, [], 'switching WebGPU quality never resizes shadow textures');
assert.deepEqual(webGpuPoolLightCounts, [4, 4, 4, 4], 'WebGPU keeps a fixed four-light pool across quality tiers');
assert.equal(webGpuQuality.lampSlots[0].shadow.mapSize.x, 1024, 'WebGPU lamp shadow targets stay at 1K');
assert.equal(webGpuQuality.lampSlots[0].castShadow, false, 'Ultra does not re-enable WebGPU lamp shadows');

const adaptiveScaleChanges = [];
const adaptiveScaleGame = Object.create(context.ld.prototype);
Object.assign(adaptiveScaleGame, {
  state: 'playing', paused: false, userPickedQuality: true,
  perf: { t: 0, frames: 0 }, pipeline: {
    isWebGPU: true, qualityName: 'low', performanceScale: 1,
    setPerformanceScale(scale) { adaptiveScaleChanges.push(scale); this.performanceScale = scale; return true; },
  },
  hud: { toast() {} },
  setQuality() { throw new Error('Low is the final quality tier'); },
});
for (let frame = 0; frame < 356; frame++) adaptiveScaleGame.adaptQuality(1 / 59);
assert.deepEqual(adaptiveScaleChanges, [], 'WebGPU does not lower render resolution at sustained 59 FPS');
assert.equal(adaptiveScaleGame.performanceEffectsReduced, true, 'sustained low FPS reduces optional effects on Low');
adaptiveScaleGame.perf = { t: 0, frames: 0 };
for (let frame = 0; frame < 542; frame++) adaptiveScaleGame.adaptQuality(1 / 90);
assert.deepEqual(adaptiveScaleChanges, [], 'WebGPU keeps render resolution stable after recovery');
assert.equal(adaptiveScaleGame.performanceEffectsReduced, false, 'optional effects restore after sustained headroom');

// The actual WebGL composer must keep GTAO at half buffer resolution after
// creation and resize; a constructor-only size check misses composer resizes.
let drawingWidth = 800;
let drawingHeight = 600;
let drawingRatio = 1;
const fakeRenderer = {
  domElement: { clientWidth: drawingWidth, clientHeight: drawingHeight },
  shadowMap: {},
  setClearColor() {},
  setPixelRatio(ratio) { drawingRatio = ratio; },
  getPixelRatio() { return drawingRatio; },
  setSize(width, height) { drawingWidth = width; drawingHeight = height; },
  getDrawingBufferSize(target) { return target.set(drawingWidth * drawingRatio, drawingHeight * drawingRatio); },
};
context.window.__GBH_RENDERER__ = { kind: 'webgl', renderer: fakeRenderer };
context.window.devicePixelRatio = 2;
context.matchMedia = () => ({ matches: false });
load('render-pipeline');
const qualityPipeline = new context.Zc(null, new context.vt(), new context.hi(60, 4 / 3, 1, 260));
qualityPipeline.setQuality('ultra');
assert.equal(qualityPipeline.gtao.width, 800, 'Ultra GTAO starts at half the 2x drawing width');
assert.equal(qualityPipeline.gtao.height, 600, 'Ultra GTAO starts at half the 2x drawing height');
let pipelineBuilds = 0;
const originalPipelineBuild = qualityPipeline.build.bind(qualityPipeline);
qualityPipeline.build = () => { pipelineBuilds += 1; return originalPipelineBuild(); };
qualityPipeline.setQuality('high');
assert.equal(pipelineBuilds, 0, 'High and Ultra reuse the existing post-processing passes');
qualityPipeline.setQuality('ultra');
assert.equal(pipelineBuilds, 0, 'switching back to Ultra does not rebuild the post-processing passes');
qualityPipeline.setSize(1000, 700, 1.5);
assert.equal(qualityPipeline.gtao.width, 750, 'Ultra GTAO stays at half resolution after resize');
assert.equal(qualityPipeline.gtao.height, 525, 'Ultra GTAO height stays at half resolution after resize');
qualityPipeline.setQuality('medium');
assert.equal(pipelineBuilds, 1, 'changing AO or MSAA configuration rebuilds the required passes');
const fullPixelRatio = qualityPipeline.getPixelRatio(1000, 700);
qualityPipeline.setPerformanceScale(0.8);
assert.equal(qualityPipeline.performanceScale, 0.8, 'manual render scale is clamped and stored');
assert.equal(qualityPipeline.getPixelRatio(1000, 700), fullPixelRatio, 'render scale cannot push a supported viewport below its HD floor');
qualityPipeline.setPerformanceScale(1);
context.window.__GBH_RENDERER__ = undefined;

// Multiplayer effects are cosmetic: a server leap first animates in the air,
// then plays the same landing effect as solo without applying local damage.
const visualCalls = [];
const visualGame = Object.create(context.ld.prototype);
const networkEntity = {
  def: context.Bc.titan, alive: true, isPlayer: false, x: 0, z: 0,
  superColor: new context.J(0xffd23a), lightColor: new context.J(0xff5a4a),
  model: { body: { rotation: { x: 0 } } },
  root: { position: new context.H(), rotation: { y: 0 }, visible: true },
  vel: { set() {} }, punch: [0, 0], recoil: 0, squash: 0,
  animate() {},
};
Object.assign(visualGame, {
  networkEntities: new Map([['titan', networkEntity]]),
  effects: {
    dust() {},
    slam() { visualCalls.push('slam'); },
    explosion() { visualCalls.push('explosion'); },
    burst() {}, impact() {},
  },
  audio: { play(name) { visualCalls.push(name); } },
  shakeAmp: 0,
});
visualGame.handleNetworkEvent({ type: 'SUPER_DASH', ownerId: 'titan', fromX: 0, fromZ: 0, toX: 4, toZ: 0 });
visualGame.updateNetworkPresentation(networkEntity, 0.375, true);
assert.ok(networkEntity.root.position.y > 3, 'network leap uses the solo airborne arc');
visualGame.handleNetworkEvent({ type: 'EXPLOSION', ownerId: 'titan', x: 4, z: 0, radius: 2.3, super: true });
assert.ok(!visualCalls.includes('slam'), 'early server impact waits for visual landing');
visualGame.updateNetworkPresentation(networkEntity, 0.375, true);
assert.equal(networkEntity.root.position.y, 0, 'network leap lands on the ground');
assert.equal(visualCalls.filter(call => call === 'slam').length, 1, 'landing effect plays exactly once');
assert.ok(!visualCalls.includes('explosion'), 'leap avoids an early generic explosion');
visualGame.handleNetworkEvent({ type: 'EXPLOSION', ownerId: 'titan', x: 4, z: 0, radius: 2.3, super: true });
assert.equal(visualCalls.filter(call => call === 'slam').length, 2, 'late server impact still renders after visual landing');
networkEntity.networkDash = { leap: true };
networkEntity.networkPendingSlam = { x: 4, z: 0, radius: 2.3, color: networkEntity.superColor };
visualGame.handleNetworkEvent({ type: 'RESPAWN', playerId: 'titan', x: 1, z: 2 });
assert.equal(networkEntity.networkDash, null, 'respawn clears stale network dash');
assert.equal(networkEntity.networkPendingSlam, null, 'respawn clears queued impact');
assert.equal(networkEntity.root.visible, true, 'respawn makes the remote character visible');

const networkScene = new context.vt();
const sharedGeometry = new context.fr(0.4, 0.4, 0.4);
const sharedMaterial = new context.Nr({ color: 0xffc93a });
const lightRequests = [];
const arrowInstances = { count: 0, instanceMatrix: { count: 64, needsUpdate: false }, setMatrixAt() {} };
const networkVisualGame = Object.create(context.ld.prototype);
Object.assign(networkVisualGame, {
  scene: networkScene, elapsed: 1, lowEndDevice: true,
  pipeline: { quality: { tier: 0 } },
  lighting: { night: 0, addLight(...args) { lightRequests.push(args); } },
  combat: {
    itemGeo: sharedGeometry, itemMaterials: { heal: sharedMaterial }, itemLights: { heal: new context.J(0x54ff82) },
    arrowShowerDiscGeometry: sharedGeometry, arrowShowerRingGeometry: sharedGeometry,
    arrowShowerDiscMaterial: sharedMaterial, arrowShowerRingMaterial: sharedMaterial,
    characterAreaOrbGeometry: sharedGeometry,
    weaponProjectiles: { arrow: arrowInstances },
  },
  networkProjectiles: new Map(), networkProjectilePool: [], networkProjectileGeometries: new Map(),
  networkProjectileOwnedGeometries: new Set(), networkProjectileMaterials: new Map(),
  networkItems: new Map(), networkAreaPulse: new Map(), networkAreaMarkers: new Map(),
  networkArrowFalls: [], networkTrapMarkers: new Map(),
});
networkVisualGame.syncNetworkTraps([{ id: 'server-trap-1', kind: 'poison', x: 2, z: 3, radius: 3.6, phase: 'warning', remaining: 5 }]);
assert.equal(networkVisualGame.networkTrapMarkers.size, 1, 'multiplayer renders the server trap warning marker');
networkVisualGame.syncNetworkTraps([]);
assert.equal(networkVisualGame.networkTrapMarkers.size, 0, 'multiplayer removes trap markers when the server ends them');
const projectile = { id: 'bolt-1', kind: 'bolt', x: 1, z: 2, dirX: 1, dirZ: 0, electric: true };
networkVisualGame.syncNetworkProjectiles([projectile]);
const firstProjectileMesh = networkVisualGame.networkProjectiles.get(projectile.id);
assert.equal(lightRequests.length, 1, 'multiplayer projectile requests a pooled light');
networkVisualGame.syncNetworkProjectiles([]);
assert.equal(networkVisualGame.networkProjectilePool.length, 1, 'removed projectile returns to the pool');
networkVisualGame.syncNetworkProjectiles([{ ...projectile, id: 'bolt-2' }]);
assert.equal(networkVisualGame.networkProjectiles.get('bolt-2'), firstProjectileMesh, 'network projectile reuses its mesh');
networkVisualGame.syncNetworkItems([{ id: 'heal-1', kind: 'heal', x: 2, z: 3 }]);
assert.equal(lightRequests.length, 3, 'multiplayer item requests a pooled light');
networkVisualGame.syncNetworkAreas([{ id: 'zone-1', kind: 'arrow-shower', x: 0, z: 0, radius: 3.4 }]);
assert.equal(networkVisualGame.networkAreaMarkers.size, 1, 'arrow shower uses a persistent solo-style marker');
networkVisualGame.combat.createShrineVisual = () => {
  const model = new context.ut();
  model.name = 'malevolent-shrine';
  model.userData.sharedShrineMaterial = true;
  return model;
};
networkVisualGame.syncNetworkAreas([
  { id: 'zone-1', kind: 'arrow-shower', x: 0, z: 0, radius: 3.4 },
  { id: 'shrine-1', kind: 'sukuna-zone', x: 0, z: 0, radius: 4.5, warning: 0.45 },
]);
assert.equal(networkVisualGame.networkAreaMarkers.get('shrine-1').userData.shrine.name, 'malevolent-shrine', 'multiplayer Sukuna Super attaches the shrine model');
networkVisualGame.syncNetworkAreas([
  { id: 'zone-1', kind: 'arrow-shower', x: 0, z: 0, radius: 3.4 },
  { id: 'gojo-blue', kind: 'gojo-pull', x: 1, z: 2, radius: 2.4, remaining: 2.4, color: 0x416cff },
]);
const gojoBlueMarker = networkVisualGame.networkAreaMarkers.get('gojo-blue');
assert.equal(gojoBlueMarker.userData.areaOrb.geometry, networkVisualGame.combat.characterAreaOrbGeometry, 'multiplayer Gojo Blue renders its shared orb geometry');
networkVisualGame.syncNetworkAreas([
  { id: 'zone-1', kind: 'arrow-shower', x: 0, z: 0, radius: 3.4 },
  { id: 'gojo-blue', kind: 'gojo-pull', x: 1, z: 2, radius: 2.4, remaining: 0.11, color: 0x416cff },
]);
assert.ok(gojoBlueMarker.userData.areaOrb.material.opacity < 0.6, 'multiplayer Gojo Blue orb fades near the 2.4-second expiry');
networkVisualGame.spawnNetworkArrowFalls(0, 0, 3.4);
networkVisualGame.updateNetworkArrowFalls(0.1);
assert.ok(arrowInstances.count > 0, 'arrow shower fills the shared instanced arrow mesh');
networkVisualGame.clearNetworkVisuals();
assert.equal(arrowInstances.count, 0, 'leaving multiplayer clears falling arrows');
assert.equal(networkVisualGame.networkProjectiles, null, 'leaving multiplayer clears projectile state');
assert.equal(networkVisualGame.networkAreaMarkers, null, 'leaving multiplayer clears area markers');

let soloBlueMarkerRemoved = false;
const soloBlueTarget = {
  alive: true, x: 0, z: 3, hardCCT: 0, airborne: false, hp: 1000,
  slowEffects: new Map(), knock: { set() {} },
  root: { position: { x: 0, y: 0, z: 3, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } },
  takeDamage(amount) { this.hp -= amount; this.lastDamageBlocked = false; return amount; },
};
const soloBlueOwner = { alive: true, id: 'gojo-blue-solo', x: 0, z: 0, damageMul: 1, def: context.Bc.gojo, attackSerial: 0, recoil: 0 };
const soloBlueArea = {
  owner: soloBlueOwner, kind: 'gojo-pull', x: 0, z: 2, attack: context.Bc.gojo.skills[0],
  marker: { scale: { setScalar() {} }, removeFromParent() { soloBlueMarkerRemoved = true; } },
  disc: { material: {} }, ring: { material: {} }, orb: null,
  remaining: 2.4, warningRemaining: 0, activeRemaining: 2.4, activated: true,
  nextWave: 0, waves: 0, hitTargets: new Set(), blockedTargets: new Set(), slowKey: 'gojo:solo-blue',
};
const soloAreaCombat = Object.create(context.Su.prototype);
Object.assign(soloAreaCombat, {
  characterAreas: [soloBlueArea],
  game: {
    elapsed: 0, brawlers: [soloBlueOwner, soloBlueTarget],
    world: { resolveCircle(point) { return point; } },
    audio: { play() {} }, effects: {},
  },
});
for (let frame = 0; frame < 71; frame += 1) soloAreaCombat.updateCharacterAreas(1 / 30);
assert.equal(soloAreaCombat.characterAreas.length, 1, 'solo Gojo Blue stays active until its 2.4-second limit');
soloAreaCombat.updateCharacterAreas(1 / 30);
assert.equal(soloAreaCombat.characterAreas.length, 0, 'solo Gojo Blue expires at the 2.4-second limit');
assert.equal(soloBlueMarkerRemoved, true, 'solo Gojo Blue removes its marker at expiry');
assert.equal(soloBlueTarget.slowEffects.has(soloBlueArea.slowKey), false, 'solo Gojo Blue clears its slow at expiry');

const soloParry = Object.create(context.fu.prototype);
Object.assign(soloParry, {
  alive: true, spawnT: 0, flickerInvulnT: 0, hardCCT: 0,
  def: context.Bc.ello, id: 'solo-ello', root: { position: { x: 0, z: 0 } }, facing: 0,
  skillParryT: 0.55, skillParryFacing: 0, parryEmpowerT: 0, iaidoEmpowered: false,
  superColor: new context.J(0xffdc75),
  game: { effects: { impact() {} }, audio: { play() {} } },
});
assert.equal(soloParry.takeDamage(500, { x: 0, z: 2 }, false, { kind: 'melee' }), 0, 'solo Ello parries a frontal hit');
assert.equal(soloParry.lastDamageBlocked, true, 'solo parry marks the hit as blocked');
assert.equal(soloParry.parryEmpowerT, 2, 'solo parry empowers Iaido');

let soloPiercingAttack;
const soloArcher = Object.create(context.fu.prototype);
Object.assign(soloArcher, {
  alive: true, hardCCT: 0, skill2Charge: null, leap: null, networkLeapT: 0,
  dash: null, flicker: null, def: context.Bc.syafiah, fireCooldown: 0,
  burst: null, pierceCoverShots: 1, attackSerial: 0, aimAngle: 0, revealT: 0,
  root: { position: { x: 0, z: 0 } },
  game: { state: 'playing', elapsed: 1, world: { surfaceAt: () => null }, audio: { play() {} } },
  startVolley(attack) { soloPiercingAttack = attack; },
});
assert.equal(soloArcher.attack(0, 1, 0, 0, 0.7), true, 'solo charged Eagle Eye arrow fires');
assert.equal(soloPiercingAttack.pierceCover, true, 'solo Eagle Eye shot pierces cover');
assert.equal(soloPiercingAttack.pierceCoverCount, 1, 'solo Eagle Eye shot pierces one cover');
assert.equal(soloArcher.pierceCoverShots, 0, 'solo Eagle Eye charge is consumed once');

const shrineMaterials = {
  wood: new context.Nr({ color: 0x4b2028 }),
  red: new context.Nr({ color: 0x9b2937 }),
  roof: new context.Nr({ color: 0x201b29 }),
  gold: new context.Nr({ color: 0xc29346 }),
};
const shrineHarness = Object.create(context.Su.prototype);
shrineHarness.shrineMaterials = shrineMaterials;
const shrine = shrineHarness.createShrineVisual();
assert.equal(shrine.name, 'malevolent-shrine', 'Sukuna Super builds a named shrine model');
assert.equal(shrine.children.length, 4, 'Sukuna shrine uses four merged static meshes');
assert.ok(shrine.children.every(mesh => mesh.userData.sharedShrineMaterial && !mesh.castShadow && !mesh.receiveShadow), 'Sukuna shrine meshes reuse static materials without dynamic shadows');
shrineMaterials.wood.dispose(); shrineMaterials.red.dispose(); shrineMaterials.roof.dispose(); shrineMaterials.gold.dispose();

const gojoVfxCalls = [];
const gojoVfxHarness = {
  game: { effects: {
    flash() { gojoVfxCalls.push('flash'); }, burst() { gojoVfxCalls.push('burst'); },
    ring() { gojoVfxCalls.push('ring'); }, electricImpact() { gojoVfxCalls.push('electricImpact'); },
    spark() { gojoVfxCalls.push('spark'); },
  } },
};
context.Su.prototype.playGojoSuperVfx.call(gojoVfxHarness, { x: 0, z: 0 }, 1, 2);
assert.deepEqual(gojoVfxCalls, ['flash', 'burst', 'ring', 'electricImpact', ...Array(10).fill('spark')], 'Gojo Super plays its complete particle cast effect');

const networkSuperCalls = [];
const networkSuperEntities = new Map(['gojo', 'sukuna'].map(id => [id, {
  def: context.Bc[id], x: 0, z: 0, superColor: new context.J(context.Bc[id].super.color),
  startSkillAnimation(skill, duration) { networkSuperCalls.push([id, skill, duration]); },
}]));
const networkSuperHarness = Object.assign(Object.create(context.ld.prototype), {
  networkEntities: networkSuperEntities,
  combat: { playGojoSuperVfx() { networkSuperCalls.push(['gojo-particles']); } },
  effects: { burst() {} }, audio: { play() {} },
});
networkSuperHarness.handleNetworkEvent({ type: 'SUPER_USED', ownerId: 'gojo', kind: 'gojo-domain', targetX: 2, targetZ: 3 });
networkSuperHarness.handleNetworkEvent({ type: 'SUPER_USED', ownerId: 'sukuna', kind: 'sukuna-zone', targetX: 2, targetZ: 3 });
assert.deepEqual(networkSuperCalls, [['gojo', 3, 4], ['gojo-particles'], ['sukuna', 3, 0.9]], 'multiplayer Gojo and Sukuna Super events trigger their cast poses and Gojo particles');

const sizes = {};
const designDefinitions = Object.values(context.GBH_CHARACTER_DESIGNS).map(def => ({ ...context.Bc.titan, ...def }));
assert.equal(Object.keys(context.Bc).length, 10, 'the two sorcerer designs are wired into the playable roster');
for (const def of [...Object.values(context.Bc), ...designDefinitions]) {
  const model = context.uu(def, 0);
  model.root.updateMatrixWorld(true);
  assert.equal(model.legs.length, 2);
  assert.equal(model.arms.length, 2);
  assert.ok(model.muzzles.length > 0);
  assert.ok(model.torso.parent, `${def.id}: torso reference survived merging`);
  const usedMaterials = new Set();
  let meshes = 0, triangles = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  model.root.traverse(part => {
    if (!part.isMesh) return;
    meshes++;
    usedMaterials.add(part.material);
    assert.ok(model.allMats.includes(part.material), `${def.id}: material owned by model`);
    const positions = part.geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      const point = new context.H().fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld);
      [point.x, point.y, point.z].forEach((value, axis) => {
        assert.ok(Number.isFinite(value), `${def.id}: finite geometry`);
        min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
      });
    }
    triangles += (part.geometry.index?.count || positions.count) / 3;
  });
  sizes[def.id] = max.map((v, i) => v - min[i]);
  assert.ok(meshes < 90, `${def.id}: merged draw-call budget (${meshes})`);
  if (def.visual) {
    assert.ok(min[1] >= 0, `${def.id}: feet above ground at rest`);
    assert.ok(max[1] < 1.8, `${def.id}: fits existing overhead UI`);
    assert.ok(model.muzzles.every(point => point.z > 0 && point.y > 0));
    const duplicate = context.uu(def, 0.08);
    const firstMeshes = [], duplicateMeshes = [];
    model.root.traverse(part => { if (part.isMesh) firstMeshes.push(part); });
    duplicate.root.traverse(part => { if (part.isMesh) duplicateMeshes.push(part); });
    assert.equal(firstMeshes.length, duplicateMeshes.length);
    firstMeshes.forEach((part, index) => assert.equal(part.geometry, duplicateMeshes[index].geometry, 'geometry cache reuse'));
    assert.notEqual(model.flashMats[0], duplicate.flashMats[0], 'independent damage flash');
    if (def.visual === 'sorcerer') {
      assert.equal(model.clothPivots.length, 6, 'split coat retains independent animation pivots');
      assert.equal(model.elbows.length, 2, 'redesign has two articulated arms');
      assert.equal(model.energy.length, 2, 'both hands have cosmetic energy anchors');
      assert.ok(model.root.userData.parts.includes(def.id === 'gojo' ? 'standing-high-collar' : 'crimson-chest-mark'));
      model.updateVisualPose(2, true, 1);
      assert.ok(model.energy.every(part => part.visible), 'casting enables hand accents');
      model.updateVisualPose(2, false, 0);
      assert.ok(model.energy.every(part => part.visible), 'signature hand effects stay visible at rest');
      if (def.id === 'gojo') {
        const handHasMaterial = (hand, color) => {
          let found = false;
          hand.traverse(part => { if (part.isMesh && part.material.color.getHex() === color) found = true; });
          return found;
        };
        assert.ok(handHasMaterial(model.energy[0], 0x346dff), 'Gojo carries Blue in one hand');
        assert.ok(handHasMaterial(model.energy[1], 0xff384f), 'Gojo carries Red in the other hand');
      } else {
        assert.equal(model.root.userData.parts.filter(name => name === 'hand-flame').length, 6, 'Sukuna has three visible flame shapes per hand');
        assert.ok(model.energy.every(hand => {
          let hasFire = false;
          hand.traverse(part => { if (part.isMesh && part.material.color.getHex() === 0xff5a26) hasFire = true; });
          return hasFire;
        }), 'Sukuna carries flame effects in both hands');
      }
    }
    duplicate.allMats.forEach(material => material.dispose());
    if (def.id === 'fuse') assert.ok(model.root.userData.parts.includes('amber-goggle-lens'));
    if (def.id === 'volt') {
      assert.ok(!model.root.userData.parts.some(name => name.includes('goggle')));
      assert.ok(model.root.userData.parts.includes('swept-back-hair'));
      assert.ok(model.electricCore?.parent === model.weapon);
    }
    // Exercise the actual gameplay animation, including recoil and punches.
    const game = { scene: new context.vt(), elapsed: 1, effects: { footDust() {} } };
    const brawler = new context.fu(game, def, { x: 0, z: 0, isPlayer: true, name: 'Test' });
    brawler.vel.set(2, 1);
    brawler.recoil = 0.8;
    brawler.flash = 0.4;
    brawler.punch = [0.7, 0.3];
    for (let frame = 0; frame < 20; frame++) {
      game.elapsed += 1 / 60;
      brawler.animate(1 / 60, true);
    }
    if (def.id === 'gojo' || def.id === 'sukuna') {
      brawler.recoil = 0;
      brawler.punch = [0, 0];
      const restingArms = brawler.model.arms.map(arm => ({ x: arm.rotation.x, z: arm.rotation.z }));
      brawler.startSkillAnimation(3, 4);
      for (let frame = 0; frame < 8; frame += 1) brawler.animate(1 / 60, true);
      assert.ok(brawler.model.arms.some((arm, index) =>
        Math.abs(arm.rotation.x - restingArms[index].x) > 0.04 || Math.abs(arm.rotation.z - restingArms[index].z) > 0.04,
      ), `${def.id}: Super has a distinct cast pose`);
    }
    brawler.root.updateMatrixWorld(true);
    brawler.root.traverse(part => assert.ok(part.matrixWorld.elements.every(Number.isFinite), `${def.id}: animated transforms`));
    assert.ok(brawler.model.flashMats.every(material => material.emissive.r > 0), 'damage flash works');
    brawler.dispose();
    assert.equal(game.scene.children.length, 0, 'model removed on disposal');
  }
  console.log(`${def.name}: ${meshes} meshes, ${triangles} triangles, size ${sizes[def.id].map(n => n.toFixed(2)).join(' × ')}`);
  model.allMats.forEach(material => material.dispose());
}
assert.ok(sizes.titan[0] > sizes.fuse[0] * 1.2, 'tank is substantially wider');
assert.ok(sizes.volt[1] > sizes.fuse[1], 'runner has a taller silhouette');
for (const id of ['dusty', 'fuse', 'volt']) {
  for (const property of ['hp', 'speed', 'reload', 'superCharge']) assert.equal(context.Bc[id][property], original[id][property]);
  for (const slot of ['attack', 'super']) {
    const before = { ...original[id][slot] }, after = { ...context.Bc[id][slot] };
    delete before.color; delete after.color;
    assert.deepEqual(after, before, `${id}: ${slot} gameplay preserved`);
  }
}
console.log('PASS: ten gameplay rigs + two design rigs, solo skills/domains/barrier/parry, Super respawn retention, bot targeting/roster, auto-aim priority, adaptive effects and HD resolution floor, items/Flicker/traps, multiplayer visuals, material ownership, silhouettes, and combat tuning.');
