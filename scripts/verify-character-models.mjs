import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CHARACTER_DEFS } from '../shared/data/characters.js';

const context = vm.createContext({ console, URLSearchParams });
context.window = context;
context.performance = performance;
const load = (file) => vm.runInContext(readFileSync(new URL(`../public/engine/${file}.js`, import.meta.url), 'utf8'), context, { filename: file });
load('three-legacy');
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
const characterIds = Object.keys(context.Bc);
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
const botRoster = Array.from(context.createBalancedBotRoster(characterIds, 15, 0x13579bdf));
assert.equal(botRoster.length, 15, 'solo Deathmatch roster fills all bot slots');
assert.deepEqual(Array.from(context.createBalancedBotRoster(characterIds, 15, 0x13579bdf)), botRoster, 'same seed keeps bot roster deterministic');
for (const characterId of characterIds) {
  assert.ok(botRoster.filter(id => id === characterId).length <= 2, `${characterId}: at most two Deathmatch bots`);
}
for (let seed = -32; seed <= 32; seed += 1) {
  const seededRoster = context.createBalancedBotRoster(characterIds, 15, seed);
  for (const characterId of characterIds) {
    assert.ok(seededRoster.filter(id => id === characterId).length <= 2, `${characterId}: roster seed ${seed} stays under the bot cap`);
  }
}

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

// A manual Ultra selection must recover when the renderer falls to single-digit FPS.
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
assert.deepEqual(qualityChanges, ['high'], 'manual Ultra recovers from sustained 5 FPS');
assert.ok(context.Uc.high.shadowMap < 4096 && context.Uc.ultra.lampMap < 2048, 'High/Ultra cap expensive shadow targets');
const webGpuShadowWrites = [];
const webGpuQuality = {
  pipeline: { isWebGPU: true, usingPCSS: false },
  mapSize: 2048,
  key: { shadow: { mapSize: { x: 2048, set(x, y) { webGpuShadowWrites.push(['sun', x, y]); this.x = x; } }, radius: 0 } },
  lampShadowSlots: 4,
  lampSlots: Array.from({ length: 8 }, () => ({
    castShadow: true,
    shadow: { mapSize: { x: 1024, set(x, y) { webGpuShadowWrites.push(['lamp', x, y]); this.x = x; } }, radius: 0 },
  })),
  setPoolSize() {},
  invalidateShadowMap() {},
  updateShadowParams() {},
};
context.kl.prototype.applyQuality.call(webGpuQuality, context.Uc.low);
assert.equal(webGpuQuality.mapSize, 2048, 'WebGPU uses a stable 2K sun shadow target at startup');
assert.deepEqual(webGpuShadowWrites, [], 'WebGPU initializes its sun shadow target before the first frame');
context.kl.prototype.applyQuality.call(webGpuQuality, context.Uc.ultra);
assert.deepEqual(webGpuShadowWrites, [], 'switching WebGPU quality never resizes in-flight shadow textures');
assert.equal(webGpuQuality.lampSlots[0].shadow.mapSize.x, 1024, 'WebGPU lamp shadow targets stay at 1K');
assert.equal(webGpuQuality.lampSlots[0].castShadow, true, 'Ultra keeps WebGPU lamp shadows enabled');

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
networkVisualGame.syncNetworkAreas([
  { id: 'zone-1', kind: 'arrow-shower', x: 0, z: 0, radius: 3.4 },
  { id: 'gojo-blue', kind: 'gojo-pull', x: 1, z: 2, radius: 2.4, remaining: 1.4, color: 0x416cff },
]);
const gojoBlueMarker = networkVisualGame.networkAreaMarkers.get('gojo-blue');
assert.equal(gojoBlueMarker.userData.areaOrb.geometry, networkVisualGame.combat.characterAreaOrbGeometry, 'multiplayer Gojo Blue renders its shared orb geometry');
networkVisualGame.syncNetworkAreas([
  { id: 'zone-1', kind: 'arrow-shower', x: 0, z: 0, radius: 3.4 },
  { id: 'gojo-blue', kind: 'gojo-pull', x: 1, z: 2, radius: 2.4, remaining: 0.11, color: 0x416cff },
]);
assert.ok(gojoBlueMarker.userData.areaOrb.material.opacity < 0.6, 'multiplayer Gojo Blue orb fades near the 1.4-second expiry');
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
  remaining: 1.4, warningRemaining: 0, activeRemaining: 1.4, activated: true,
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
for (let frame = 0; frame < 41; frame += 1) soloAreaCombat.updateCharacterAreas(1 / 30);
assert.equal(soloAreaCombat.characterAreas.length, 1, 'solo Gojo Blue stays active until its 1.4-second limit');
soloAreaCombat.updateCharacterAreas(1 / 30);
assert.equal(soloAreaCombat.characterAreas.length, 0, 'solo Gojo Blue expires at the 1.4-second limit');
assert.equal(soloBlueMarkerRemoved, true, 'solo Gojo Blue removes its marker at expiry');
assert.equal(soloBlueTarget.slowEffects.has(soloBlueArea.slowKey), false, 'solo Gojo Blue clears its slow at expiry');

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
console.log('PASS: ten gameplay rigs + two design rigs, bot roster, solo items/Flicker/traps, multiplayer visual lifecycle, quality fallback, material ownership, silhouettes, and combat tuning.');
