import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ console, URLSearchParams });
context.window = context;
const load = (file) => vm.runInContext(readFileSync(new URL(`../public/engine/${file}.js`, import.meta.url), 'utf8'), context, { filename: file });
load('three-legacy');
const original = JSON.parse(JSON.stringify(context.Bc));
load('character-roster');
load('world');
load('character-models');
load('brawlers');
const sizes = {};
for (const def of Object.values(context.Bc)) {
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
console.log('PASS: all eight rigs, animation/recoil/flash, cached geometry, material ownership, silhouettes, and preserved combat tuning.');

