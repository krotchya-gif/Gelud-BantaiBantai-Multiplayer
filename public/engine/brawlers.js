// Shared low-poly weapon silhouettes, also used by the instanced projectile batches.
function brawlerProjectileGeometry(kind) {
  return $l(`weapon-${kind}`, () => {
    let parts = [];
    if (kind === `shuriken`) {
      parts.push(nu(0.095, 0.095, 0.035, 8).clone());
      for (let j = 0; j < 4; j++) {
        let angle = j * Math.PI / 2;
        parts.push(nu(0, 0.12, 0.3, 4).clone().rotateX(Math.PI / 2)
          .scale(1, 0.18, 1).translate(0, 0, 0.19).rotateY(angle));
      }
    } else {
      parts.push(nu(0.018, 0.018, 0.72, 6).clone().rotateX(Math.PI / 2));
      parts.push(nu(0, 0.075, 0.17, 4).clone().rotateX(Math.PI / 2).translate(0, 0, 0.43));
      parts.push(ru(0.16, 0.02, 0.17).clone().translate(0, 0, -0.28));
      parts.push(ru(0.02, 0.16, 0.17).clone().translate(0, 0, -0.28));
    }
    let geometry = Nl(parts);
    parts.forEach(part => part.dispose());
    geometry.computeBoundingSphere();
    return geometry;
  });
}
var brawlerMergeGeometryCache = new Map();
function mergeBrawlerPivot(e, t, n) {
  let r = new Map();
  for (let i of e.children.slice()) {
    if (!i.isMesh || Array.isArray(i.material) || !i.visible || i.isSkinnedMesh || i.morphTargetInfluences) continue;
    let e = i.material,
      t = `${+i.castShadow}|${+i.receiveShadow}|${i.renderOrder}|${i.layers.mask}|${+!!i.userData.noAO}`,
      n = r.get(e);
    n || ((n = new Map()), r.set(e, n));
    let a = n.get(t);
    a || ((a = { meshes: [], source: i }), n.set(t, a));
    a.meshes.push(i);
  }
  let i = new Map(),
    a = 0;
  for (let [o, s] of r)
    for (let [c, l] of s) {
      let u = a++;
      if (l.meshes.length < 2) continue;
      let d = `${t}:${n}:${u}`,
        f = brawlerMergeGeometryCache.get(d);
      if (!f) {
        let t = [];
        for (let n of l.meshes) (n.updateMatrix(), t.push(n.geometry.clone().applyMatrix4(n.matrix)));
        f = Nl(t);
        t.forEach((e) => e.dispose());
        if (!f) continue;
        (f.computeBoundingSphere(), brawlerMergeGeometryCache.set(d, f));
      }
      let p = l.source,
        m = new Ln(f, o);
      ((m.castShadow = p.castShadow),
        (m.receiveShadow = p.receiveShadow),
        (m.renderOrder = p.renderOrder),
        (m.layers.mask = p.layers.mask),
        (m.userData.noAO = p.userData.noAO),
        e.add(m),
        l.meshes.forEach((e) => (i.set(e, m), e.removeFromParent())));
    }
  return i;
}
function uu(e, t) {
  if (e.visual) return buildReferenceBrawler(e, t);
  let n = e.palette,
    r = {
      body: lu(n.body),
      accent: lu(n.accent),
      skin: lu(n.skin, { roughness: 0.72 }),
      dark: lu(n.dark, { roughness: 0.8 }),
      metal: lu(10133938, { metalness: 0.75, roughness: 0.3 }),
      wood: lu(8014370, { roughness: 0.75 }),
      white: lu(16777215, { roughness: 0.35 }),
      black: lu(1381659, { roughness: 0.4 }),
    };
  t && (r.body.color.offsetHSL(t, 0, 0), r.accent.color.offsetHSL(t * 0.6, 0, 0));
  let i = lu(3351040, { emissive: 16765562, emissiveIntensity: 3 }),
    k = lu(4259839, { emissive: 65535, emissiveIntensity: 4.5, roughness: 0.22 }),
    a = new ut(),
    o = new ut();
  a.add(o);
  let s = (e, t, n, r = 0, i = 0, a = 0, o = 1, s = 1, c = 1) => {
      let l = new Ln(t, n);
      return (l.position.set(r, i, a), l.scale.set(o, s, c), (l.castShadow = !0), (l.receiveShadow = !0), e.add(l), l);
    },
    c = [-1, 1].map((e) => {
      let t = new ut();
      return (
        t.position.set(e * 0.13, 0.37, 0),
        s(t, tu(0.09, 0.12), r.dark, 0, -0.13, 0),
        s(t, eu(0.11), r.black, 0, -0.3, 0.05, 1, 0.62, 1.5),
        a.add(t),
        t
      );
    }),
    l = e.id === `titan`,
    u = s(o, tu(0.235, 0.2), r.body, 0, 0.6, 0, l ? 1.32 : 1, l ? 1.08 : 1, l ? 1.12 : 0.86);
  s(o, nu(0.245, 0.245, 0.075), r.dark, 0, 0.42, 0, l ? 1.28 : 1, 1, l ? 1.1 : 0.88);
  let d = new ut();
  (d.position.set(0, 1.07, 0), o.add(d));
  let f = s(d, eu(0.3, 16, 12), l ? r.body : r.skin, 0, 0, 0, 1, 0.94, 0.97);
  for (let e of [-1, 1]) {
    (s(d, eu(0.075), r.white, e * 0.115, 0.03, 0.252, 1, 1.2, 0.55),
      s(d, eu(0.04), r.black, e * 0.112, 0.03, 0.29, 1, 1.2, 0.5));
    let t = s(d, ru(0.14, 0.036, 0.04), r.dark, e * 0.115, 0.14, 0.268);
    t.rotation.z = -e * 0.32;
  }
  let p = l ? 0.38 : 0.31,
    m = [-1, 1].map((e) => {
      let t = new ut();
      (t.position.set(e * p, 0.8, 0), s(t, tu(0.075, 0.15), l ? r.skin : r.body, 0, -0.12, 0));
      let n = s(t, eu(l ? 0.165 : 0.095), l ? r.accent : r.skin, 0, -0.28, 0, 1, 1, l ? 1.12 : 1);
      return ((t.userData.hand = n), o.add(t), t);
    }),
    h = new ut();
  o.add(h);
  let g = [],
    _ = {
      armBase: [
        [0, 0],
        [0, 0],
      ],
      swingArms: !1,
    };
  if (e.id === `dusty`) {
    (s(d, iu(0.325, 0.56), r.accent, 0, 0.02, -0.025),
      s(d, eu(0.13), r.accent, 0, 0.03, -0.34),
      s(d, eu(0.09), r.accent, 0, -0.1, -0.42));
    let e = s(d, au(0.295, 0.034), r.body, 0, 0.1, 0);
    ((e.rotation.x = Math.PI / 2), h.position.set(0.02, 0.63, 0.24));
    for (let e of [-1, 1]) s(h, nu(0.045, 0.045, 0.62, 10), r.metal, e * 0.046, 0.02, 0.36).rotation.x = Math.PI / 2;
    (s(h, ru(0.1, 0.13, 0.34), r.wood, 0, -0.02, -0.06),
      s(h, ru(0.15, 0.085, 0.2), r.wood, 0, -0.04, 0.3),
      g.push(new H(0.02, 0.65, 0.95)),
      (_.armBase = [
        [-1.35, 0.55],
        [-1.2, -0.4],
      ]));
  } else if (e.id === `ace`) {
    (s(d, nu(0.2, 0.235, 0.21), r.accent, 0, 0.29, 0),
      s(d, nu(0.47, 0.47, 0.036, 28), r.accent, 0, 0.19, 0, 1, 1, 0.92),
      s(d, nu(0.24, 0.24, 0.055), r.dark, 0, 0.215, 0));
    let e = s(o, au(0.19, 0.06), r.accent, 0, 0.87, 0.02);
    ((e.rotation.x = Math.PI / 2), h.position.set(0, 0.67, 0.34));
    for (let e of [-1, 1])
      ((s(h, nu(0.035, 0.035, 0.32, 8), r.metal, e * 0.27, 0.025, 0.18).rotation.x = Math.PI / 2),
        (s(h, nu(0.058, 0.058, 0.09, 10), r.metal, e * 0.27, 0.025, 0.03).rotation.x = Math.PI / 2),
        s(h, ru(0.06, 0.14, 0.075), r.dark, e * 0.27, -0.055, -0.02),
        g.push(new H(e * 0.27, 0.7, 0.72)));
    _.armBase = [
      [-1.45, 0.08],
      [-1.45, -0.08],
    ];
  } else if (e.id === `fuse`) {
    (s(d, iu(0.335, 0.5), r.accent, 0, 0.04, 0),
      s(d, nu(0.365, 0.365, 0.035, 24), r.accent, 0, 0.06, 0.02),
      (s(d, nu(0.078, 0.078, 0.07, 12), r.metal, 0, 0.2, 0.3).rotation.x = Math.PI / 2));
    let e = s(d, eu(0.062), i, 0, 0.2, 0.34, 1, 1, 0.4);
    ((e.castShadow = !1),
      s(d, eu(0.2), r.white, 0, -0.17, 0.14, 1.12, 0.8, 0.72),
      h.position.set(0.31, 0.66, 0.36),
      s(h, eu(0.15), r.black),
      s(h, nu(0.035, 0.035, 0.07, 8), r.metal, 0, 0.16, 0));
    let t = s(h, eu(0.045), lu(3347456, { emissive: 16747050, emissiveIntensity: 4 }), 0.01, 0.23, 0);
    ((t.castShadow = !1),
      g.push(new H(0.31, 0.8, 0.4)),
      (_.armBase = [
        [0, 0.12],
        [-1.3, -0.05],
      ]),
      (_.swingLeft = !0));
  } else if (e.id === `volt`) {
    (s(d, nu(0.225, 0.27, 0.16, 20), r.accent, 0, 0.24, 0),
      s(d, au(0.31, 0.035), r.dark, 0, 0.12, 0),
      s(o, ru(0.34, 0.16, 0.12), r.accent, 0, 0.76, -0.2),
      s(o, eu(0.09), k, 0, 0.78, -0.33, 1, 0.65, 1));
    h.position.set(0, 0.67, 0.3);
    let e = new ut();
    (e.position.set(0, 0.02, 0.25), h.add(e));
    let t = s(e, eu(0.135, 18, 14), k, 0, 0, 0.08, 1, 0.82, 1.18),
      n = s(e, au(0.195, 0.025), k, 0, 0, 0.08);
    ((t.castShadow = !1), (n.castShadow = !1), (n.rotation.x = Math.PI / 2));
    let a = s(e, au(0.16, 0.02), k, 0, 0, 0.08);
    ((a.castShadow = !1), (a.rotation.y = Math.PI / 2));
    for (let e of [-1, 1]) {
      let t = s(h, nu(0.045, 0.065, 0.35, 10), r.metal, e * 0.13, 0, 0.13);
      ((t.rotation.x = Math.PI / 2), s(h, eu(0.055), k, e * 0.13, 0, 0.34).castShadow = !1);
    }
    ((h.userData.electricCore = e),
      g.push(new H(0, 0.69, 0.76)),
      s(h, ru(0.22, 0.15, 0.24), r.dark, 0, -0.03, 0.01),
      (_.armBase = [
        [-1.34, 0.22],
        [-1.34, -0.22],
      ]));
  } else if (e.id === "naka") {
    // Hood covers the crown and back, leaving a narrow skin/eye opening.
    s(d, iu(0.323, 0.48), r.body, 0, 0.045, -0.025);
    s(d, eu(0.29, 12, 8), r.body, 0, -0.08, -0.1, 1.08, 0.85, 0.8);
    s(d, eu(0.28, 12, 8), r.body, 0, -0.14, 0.06, 1, 0.52, 0.98);
    s(d, ru(0.52, 0.065, 0.06), r.dark, 0, 0.115, 0.25);
    for (let side of [-1, 1]) {
      let tail = s(d, ru(0.09, 0.055, 0.35), r.dark, side * 0.09, 0.06, -0.42);
      tail.rotation.y = side * 0.45;
      s(m[side === -1 ? 0 : 1], nu(0.082, 0.082, 0.1, 8), r.white, 0, -0.22, 0);
      s(c[side === -1 ? 0 : 1], eu(0.115, 10, 8), r.body, 0, -0.29, 0.06, 1, 0.7, 1.5);
    }
    let sash = s(o, ru(0.09, 0.4, 0.05), r.dark, 0, 0.68, 0.22);
    sash.rotation.z = -0.55;
    h.position.set(0.3, 0.68, 0.26);
    s(h, brawlerProjectileGeometry(`shuriken`), r.metal, 0, 0.02, 0.13).rotation.x = 0.7;
    g.push(new H(0.3, 0.72, 0.55));
    _.armBase = [[-0.8, 0.3], [-1.28, -0.18]];
    _.swingLeft = !0;
  } else if (e.id === "ello") {
    s(d, iu(0.32, 0.48), r.black, 0, 0.035, -0.025);
    s(d, ru(0.51, 0.075, 0.06), r.accent, 0, 0.14, 0.23);
    for (let side of [-1, 1]) {
      let fringe = s(d, ru(0.14, 0.2, 0.1), r.black, side * 0.19, 0.14, 0.19);
      fringe.rotation.z = side * 0.45;
      s(d, ru(0.065, 0.055, 0.37), r.accent, side * 0.09, 0.08, -0.42).rotation.y = side * 0.35;
      for (let row = 0; row < 3; row++) {
        s(o, ru(0.23, 0.085, 0.16), r.accent, side * 0.29, 0.91 - row * 0.075, 0);
        s(o, ru(0.2, 0.065, 0.16), r.accent, side * 0.16, 0.42 - row * 0.065, 0.13);
      }
      s(c[side === -1 ? 0 : 1], ru(0.14, 0.2, 0.065), r.dark, 0, -0.16, 0.1);
    }
    for (let row = 0; row < 4; row++) s(o, ru(0.39, 0.075, 0.08), r.accent, 0, 0.77 - row * 0.08, 0.2);
    let scabbard = s(o, ru(0.07, 0.07, 0.83), r.dark, -0.25, 0.42, -0.22);
    scabbard.rotation.y = -0.35;
    h.position.set(0.23, 0.7, 0.23);
    s(h, ru(0.065, 0.035, 0.7), r.metal, 0, 0, 0.36);
    s(h, nu(0, 0.04, 0.16, 4), r.metal, 0, 0, 0.78).rotation.x = Math.PI / 2;
    s(h, nu(0.11, 0.11, 0.035, 8), r.wood, 0, 0, -0.025).rotation.x = Math.PI / 2;
    s(h, ru(0.065, 0.06, 0.23), r.dark, 0, 0, -0.15);
    for (let j = 0; j < 3; j++) s(h, ru(0.07, 0.063, 0.025), r.accent, 0, 0, -0.08 - j * 0.06);
    g.push(new H(0.23, 0.73, 0.9));
    _.armBase = [[-1.2, 0.45], [-1.3, -0.2]];
    _.swingLeft = !0;
  } else if (e.id === "syafiah") {
    s(d, iu(0.335, 0.55), r.body, 0, 0.045, -0.05);
    for (let side of [-1, 1]) s(d, eu(0.09, 8, 6), r.accent, side * 0.24, -0.12, 0.05, 0.7, 2.1, 0.8);
    // Green cloak, leather quiver and boots give a readable ranger silhouette.
    s(o, nu(0.18, 0.34, 0.65, 6), r.dark, 0, 0.55, -0.2, 1, 1, 0.4);
    s(o, nu(0.09, 0.075, 0.43, 8), r.wood, 0.2, 0.69, -0.27).rotation.z = -0.2;
    for (let j = 0; j < 3; j++) s(o, ru(0.025, 0.4, 0.025), r.accent, 0.13 + j * 0.05, 0.91, -0.27);
    s(o, ru(0.4, 0.07, 0.07), r.wood, 0, 0.44, 0.2);
    for (let leg of c) s(leg, nu(0.1, 0.12, 0.18, 8), r.wood, 0, -0.22, 0);
    h.position.set(-0.16, 0.73, 0.36);
    // Bow lies across the aim direction, visible from the top-down camera.
    const points = [[-0.46, -0.1], [-0.34, 0.12], [-0.18, 0.21], [0, 0.24], [0.18, 0.21], [0.34, 0.12], [0.46, -0.1]];
    for (let j = 1; j < points.length; j++) {
      let [x1, z1] = points[j - 1], [x2, z2] = points[j];
      let limb = s(h, ru(0.045, 0.045, Math.hypot(x2 - x1, z2 - z1)), r.wood, (x1 + x2) / 2, 0, (z1 + z2) / 2);
      limb.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    }
    let bowRig = new ut();
    h.add(bowRig);
    h.userData.bowRig = bowRig;
    bowRig.userData.strings = [-1, 1].map(side => s(bowRig, ru(1, 0.013, 0.013), r.white, side * 0.23, 0, -0.1));
    bowRig.userData.arrow = s(bowRig, brawlerProjectileGeometry(`arrow`), r.accent, 0, 0, 0.25, 0.75, 0.75, 0.75);
    g.push(new H(-0.16, 0.73, 0.8));
    _.armBase = [[-1.5, 0.05], [-1.1, -0.6]];
  } else {
    (s(d, eu(0.2), r.skin, 0, -0.085, 0.2, 1, 0.78, 0.5), s(d, ru(0.065, 0.2, 0.44), r.accent, 0, 0.27, -0.02));
    for (let e of [-1, 1]) s(o, eu(0.14), r.accent, e * 0.37, 0.88, 0);
    (f.scale.set(1, 0.96, 1),
      g.push(new H(-0.3, 0.72, 0.55), new H(0.3, 0.72, 0.55)),
      (_.armBase = [
        [-0.95, 0.25],
        [-0.95, -0.25],
      ]),
      (_.punch = !0));
  }
  m.forEach((e, t) => {
    ((e.rotation.x = _.armBase[t][0]), (e.rotation.z = _.armBase[t][1]));
  });
  let mergedTorso = mergeBrawlerPivot(o, e.id, `body`);
  (mergeBrawlerPivot(d, e.id, `head`),
    c.forEach((t, n) => mergeBrawlerPivot(t, e.id, `leg-${n}`)),
    m.forEach((t, n) => mergeBrawlerPivot(t, e.id, `arm-${n}`)),
    mergeBrawlerPivot(h, e.id, `weapon`),
    h.userData.electricCore && mergeBrawlerPivot(h.userData.electricCore, e.id, `electric-core`),
    (u = mergedTorso.get(u) || u));
  let v = Object.values(r);
  return {
    root: a,
    body: o,
    head: d,
    torso: u,
    legs: c,
    arms: m,
    weapon: h,
    muzzles: g,
    pose: _,
    electricCore: h.userData.electricCore || null,
    flashMats: v,
    allMats: [...v, i, k],
  };
}
var du = 1,
  fu = class {
    constructor(e, t, n) {
      ((this.game = e),
        (this.def = t),
        (this.id = du++),
        (this.isPlayer = !!n.isPlayer),
        (this.name = n.name),
        (this.model = uu(t, n.hueShift || 0)),
        (this.root = this.model.root),
        this.root.position.set(n.x, 0, n.z),
        e.scene.add(this.root));
      let r = this.isPlayer ? 4063114 : 16730682;
      this.ringColor = new J(r);
      if (
        ((this.ring = new Ln(ou, new Tn({ color: r, transparent: !0, opacity: 0.92, depthWrite: !1 }))),
        (this.ring.position.y = 0.04),
        (this.ring.renderOrder = 2),
        (this.ring.userData.noAO = !0),
        this.root.add(this.ring),
        this.isPlayer)
      ) {
        let e = new Ln(su, new Tn({ color: r, transparent: !0, opacity: 0.16, depthWrite: !1 }));
        ((e.position.y = 0.035), (e.renderOrder = 2), (e.userData.noAO = !0), this.root.add(e), (this.disc = e));
      }
      ((this.superRing = new Ln(
        cu,
        new Tn({ color: new J(3.2, 2.3, 0.4), transparent: !0, opacity: 0, depthWrite: !1, blending: 2 }),
      )),
        (this.superRing.position.y = 0.045),
        (this.superRing.renderOrder = 3),
        (this.superRing.userData.noAO = !0),
        this.root.add(this.superRing),
        (this.maxHp = t.hp),
        (this.hp = t.hp),
        (this.ammo = 3),
        (this.reloadT = 0),
        (this.superCharge = 0),
        (this.comboStep = 0),
        (this.comboResetT = 0),
        (this.meleeLunge = null),
        (this.slashAnim = null),
        (this.slashTrailT = 0),
        (this.slashTip = new H()),
        (this.iaidoState = null),
        (this.cubes = 0),
        (this.kills = 0),
        (this.alive = !0),
        (this.deadT = 0),
        (this.rank = 0),
        (this.vel = new V()),
        (this.knock = new V()),
        (this.moveX = 0),
        (this.moveZ = 0),
        (this.facing = Math.atan2(-n.x, -n.z)),
        (this.aimAngle = this.facing),
        (this.aimHold = 0),
        (this.fireCooldown = 0),
        (this.burst = null),
        (this.leap = null),
        (this.dash = null),
        (this.parryT = 0),
        (this.isCharging = !1),
        (this.chargeLevel = 0),
        (this.slowT = 0),
        (this.speedBoostT = 0),
        (this.itemSpeedT = 0),
        (this.shieldT = 0),
        (this.heldItem = null),
        (this.stationaryT = 0),
        (this.attackSerial = 0),
        (this.lastVoltTarget = null),
        (this.lastVoltHit = -10),
        (this.voltChain = 0),
        (this.scatterHits = new Map()),
        (this.muzzleIndex = 0),
        (this.lastCombat = -10),
        (this.lastAttacker = null),
        (this.lastHitTime = -10),
        (this.regenT = 0),
        (this.inBush = !1),
        (this.hazardTime = 0),
        (this.revealT = 0),
        (this.hidden = !1),
        (this.flash = 0),
        (this.recoil = 0),
        (this.punch = [0, 0]),
        (this.walkPhase = Math.random() * 6),
        (this.squash = 0),
        (this.spawnT = 0),
        (this.lightColor = new J(t.attack.color)),
        (this.superColor = new J(t.super.color)));
    }
    get x() {
      return this.root.position.x;
    }
    get z() {
      return this.root.position.z;
    }
    get damageMul() {
      return 1 + this.cubes * Lc.cubeDamage;
    }
    get superReady() {
      return this.superCharge >= 1;
    }
    get usesAmmo() {
      return this.def.id !== `ello` && this.def.id !== `syafiah`;
    }
    get knockbackImmune() {
      return this.def.id === `ello` && (
        this.parryT > 0 ||
        this.iaidoState !== null ||
        (this.meleeLunge !== null && this.meleeLunge.remaining > 0) ||
        (this.slashAnim !== null && this.slashAnim.t < this.slashAnim.duration) ||
        this.dash?.attack?.iaido === !0
      );
    }
    applyKnockback(x, z, additive = !1) {
      if (this.knockbackImmune) {
        this.knock.set(0, 0);
        return;
      }
      let resistance = this.def.knockbackResistance ?? 0;
      ((x *= 1 - resistance), (z *= 1 - resistance));
      additive
        ? (this.knock.set(this.knock.x + x, this.knock.y + z))
        : this.knock.set(x, z);
    }
    get airborne() {
      return this.leap !== null;
    }
    muzzleWorld(e) {
      let t = this.model.muzzles,
        n = t[this.muzzleIndex % t.length],
        r = Math.cos(this.aimAngle),
        i = Math.sin(this.aimAngle);
      return (e.set(this.x + n.x * r + n.z * i, n.y, this.z - n.x * i + n.z * r), e);
    }
    canAct() {
      return this.alive && !this.leap && !this.dash && this.game.state !== `countdown`;
    }
    attack(e, t, n, r, chargeDuration) {
      if (!this.canAct() || (this.usesAmmo && this.ammo < 1) || this.fireCooldown > 0 || this.burst) return !1;
      let attack = this.def.attack,
        recovery = 0;
      if (this.usesAmmo) this.ammo--;
      if (this.def.id === `syafiah`) {
        let held = Number.isFinite(chargeDuration) ? Math.max(0, chargeDuration) : attack.chargeTime,
          charge = $c(held / attack.chargeTime, 0, 1),
          terrainRange = this.game.world.surfaceAt(this.x, this.z) === BIOME_SURFACE.LOW_GRAVITY
            ? (this.def.terrainAffinity?.rangeMultiplier ?? 1.1)
            : 1,
          damage = el(attack.quickDamage, attack.maxDamage, charge),
          range = el(attack.quickRange, attack.maxRange, charge),
          speed = el(attack.quickSpeed, attack.maxSpeed, charge);
        attack = {
          ...attack,
          damage: Math.round(damage * (held >= 0.70 && held <= 0.80 ? 1.1 : 1)),
          range: range * terrainRange,
          speed,
        };
        recovery = attack.shotRecovery;
      } else if (this.def.id === `ello`) {
        let comboIndex = this.comboStep,
          step = this.def.attack.combo[comboIndex] || this.def.attack.combo[0];
        attack = { ...attack, damage: step.damage };
        recovery = step.recovery;
        this.slashAnim = {
          t: 0,
          duration: Math.max(0.28, step.recovery * 0.92),
          step: comboIndex,
          isSuper: !1,
        };
        this.knock.set(0, 0);
        this.slashTrailT = 0;
        this.comboStep = (this.comboStep + 1) % this.def.attack.combo.length;
        this.comboResetT = this.def.attack.comboReset;
        let length = Math.hypot(e, t) || 1;
        this.meleeLunge = {
          dx: e / length,
          dz: t / length,
          remaining: step.lunge,
          speed: step.lunge / this.def.attack.lungeDuration,
        };
      } else if (this.def.id === `ace` && this.stationaryT >= 0.45) {
        attack = { ...attack, damage: Math.round(attack.damage * 1.1) };
        this.stationaryT = 0;
      }
      this.startVolley(attack, e, t, n, r, !1);
      if (recovery) this.fireCooldown = recovery;
      this.isCharging = !1;
      this.chargeLevel = 0;
      return !0;
    }
    useSuper(e, t, n, r) {
      if (!this.canAct() || !this.superReady || this.burst) return !1;
      let attack = this.def.super;
      if (
        this.def.id === `syafiah` &&
        this.game.world.surfaceAt(this.x, this.z) === BIOME_SURFACE.LOW_GRAVITY
      )
        attack = { ...attack, range: attack.range * (this.def.terrainAffinity?.rangeMultiplier ?? 1.1) };
      if (attack.kind === `dash`) {
        if (!this.startDash(attack, e, t, n, r)) return !1;
      } else if (attack.kind === `iaido`) {
        let length = Math.hypot(e, t) || 1;
        ((e /= length), (t /= length));
        this.meleeLunge = null;
        (this.aimAngle = Math.atan2(e, t));
        (this.facing = this.aimAngle);
        (this.root.rotation.y = this.facing);
        this.iaidoState = { attack, dx: e, dz: t, targetX: n, targetZ: r, empowered: !1 };
        this.parryT = attack.guardDuration;
        this.knock.set(0, 0);
        this.aimHold = attack.guardDuration;
        this.recoil = 1;
        this.game.effects.impact(this.x + e * 0.65, 0.72, this.z + t * 0.65, this.superColor, 8);
      } else if (attack.kind === `arrow-shower`) {
        let length = Math.hypot(e, t) || 1;
        ((e /= length), (t /= length));
        (this.aimAngle = Math.atan2(e, t));
        (this.facing = this.aimAngle);
        (this.root.rotation.y = this.facing);
        this.aimHold = 0.55;
        this.game.combat.startArrowShower(this, n, r, attack);
      } else if (attack.kind === `parry`) {
        let length = Math.hypot(e, t) || 1;
        ((e /= length),
          (t /= length),
          (this.aimAngle = Math.atan2(e, t)),
          (this.facing = this.aimAngle),
          (this.root.rotation.y = this.facing),
          (this.aimHold = attack.duration),
          (this.parryT = attack.duration),
          (this.recoil = 1),
          this.game.effects.impact(this.x + e * 0.65, 0.72, this.z + t * 0.65, this.superColor, 8));
      } else this.startVolley(attack, e, t, n, r, !0);
      return ((this.superCharge = 0), this.game.audio.play(`super`), !0);
    }
    startDash(attack, dx, dz, targetX, targetZ) {
      let directionLength = Math.hypot(dx, dz) || 1;
      ((dx /= directionLength), (dz /= directionLength));
      let length = Math.min(attack.range, Math.hypot(targetX - this.x, targetZ - this.z));
      if (length < 0.2) return !1;
      let hit = this.game.world.raycast(this.x, this.z, this.x + dx * length, this.z + dz * length);
      hit && (length = Math.max(0, hit.dist - 0.34));
      if (length < 0.2) return !1;
      this.dash = {
        attack,
        sx: this.x,
        sz: this.z,
        tx: this.x + dx * length,
        tz: this.z + dz * length,
        dx,
        dz,
        t: 0,
        duration: attack.flight,
      };
      (this.aimAngle = Math.atan2(dx, dz),
        (this.aimHold = attack.flight),
        (this.lastCombat = this.game.elapsed),
        this.game.effects.dust(this.x, this.z, 6, 1.8));
      return !0;
    }
    startVolley(e, t, n, r, i, a) {
      let o = Math.hypot(t, n) || 1;
      ((t /= o),
        (n /= o),
        (this.attackSerial++),
        (this.aimAngle = Math.atan2(t, n)),
        (this.aimHold = 0.55),
        (this.lastCombat = this.game.elapsed),
        (this.revealT = Math.max(this.revealT, 0.9)),
        (this.fireCooldown = 0.22));
      let s = this.game.combat;
      if (e.kind === `spread`) {
        this.recoil = 1;
        let r = this.muzzleWorld(new H());
        for (let t = 0; t < e.pellets; t++) {
          let n = e.pellets === 1 ? 0 : t / (e.pellets - 1) - 0.5,
            i = this.aimAngle + n * e.spread + (Math.random() - 0.5) * 0.04;
          s.spawnBullet(this, r.x, r.z, Math.sin(i), Math.cos(i), e, a, e.speed * (0.94 + Math.random() * 0.12));
        }
        (this.game.effects.muzzle(r.x, r.y, r.z, t, n, this.bulletColor(a), a ? 1.6 : 1.1),
          this.game.audio.play(a ? `blastBig` : `blast`, this.x, this.z),
          a && this.knock.set(-t * 3, -n * 3));
      } else if (e.kind === `burst` || e.kind === `melee`)
        ((this.burst = { a: e, left: e.count, timer: 0, dirX: t, dirZ: n, isSuper: a }),
          (this.fireCooldown = e.count * e.interval + 0.12));
      else if (e.kind === `lob`) {
        this.recoil = 1;
        let o = Math.min(e.range, Math.hypot(r - this.x, i - this.z)),
          c = this.muzzleWorld(new H());
        (s.spawnBomb(this, c.x, c.y, c.z, this.x + t * o, this.z + n * o, e, a),
          this.game.audio.play(`lob`, this.x, this.z),
          (this.fireCooldown = 0.3));
      } else if (e.kind === `leap`) {
        let a = $c(Math.hypot(r - this.x, i - this.z), 2, e.range),
          o = this.game.world.nearestOpen(this.x + t * a, this.z + n * a);
        ((this.leap = { a: e, t: 0, sx: this.x, sz: this.z, tx: o.x, tz: o.z, gravity: this.game.world.gravityAt(this.x, this.z) }),
          this.game.effects.dust(this.x, this.z, 10, 2.4),
          this.game.audio.play(`leap`, this.x, this.z));
      }
    }
    bulletColor(e) {
      return e ? this.superColor : this.lightColor;
    }
    fireBurstShot() {
      let e = this.burst,
        t = e.a;
      (this.muzzleIndex++, (this.recoil = 1));
      if (t.kind === `melee` && t.arc) {
        (this.game.combat.slash(this, e.dirX, e.dirZ, t, e.isSuper),
          (this.punch[this.muzzleIndex % 2] = 1),
          this.game.audio.play(e.isSuper ? `shotBig` : `punch`, this.x, this.z));
        return;
      }
      let n = this.muzzleWorld(new H()),
        r = Math.atan2(e.dirX, e.dirZ) + (Math.random() - 0.5) * 2 * (t.jitter || 0),
        i = Math.sin(r),
        a = Math.cos(r);
      (this.game.combat.spawnBullet(this, n.x, n.z, i, a, t, e.isSuper, t.speed),
        t.kind === `melee`
          ? ((this.punch[this.muzzleIndex % 2] = 1), this.game.audio.play(`punch`, this.x, this.z))
          : t.electric
            ? (this.game.effects.electricMuzzle(
                n.x,
                n.y,
                n.z,
                i,
                a,
                this.bulletColor(e.isSuper),
                e.isSuper ? 1.15 : 0.8,
              ),
              this.game.audio.play(e.isSuper ? `zapBig` : `zap`, this.x, this.z))
            : (this.game.effects.muzzle(n.x, n.y, n.z, i, a, this.bulletColor(e.isSuper), e.isSuper ? 1.1 : 0.75),
              this.game.audio.play(e.isSuper ? `shotBig` : `shot`, this.x, this.z)));
    }
    onAttackHit(target, projectile, damage) {
      if (damage <= 0) return;
      if (this.def.id === `dusty` && projectile.a.kind === `spread`) {
        let key = projectile.attackId + `:` + target.id,
          count = (this.scatterHits.get(key) || 0) + 1;
        this.scatterHits.set(key, count);
        if (count === 3 && this.ammo < 3) this.reloadT = Math.min(1, this.reloadT + 0.25 / this.def.reload);
        if (this.scatterHits.size > 48) this.scatterHits.clear();
      }
      if (this.def.id === `volt` && projectile.a.electric) {
        let previousChain = this.voltChain;
        this.voltChain = this.lastVoltTarget === target && this.game.elapsed - this.lastVoltHit <= 1.5
          ? Math.min(4, this.voltChain + 1)
          : 1;
        this.lastVoltTarget = target;
        this.lastVoltHit = this.game.elapsed;
        if (this.voltChain > previousChain) this.addCharge(70);
      }
      if (this.def.id === `naka` && projectile.returning) this.speedBoostT = 1.5;
      if (this.def.id === `ello` && projectile.melee && projectile.travel >= projectile.range * 0.5) this.addCharge(90);
    }
    addCharge(e, rate = 0.75) {
      if (!this.alive) return;
      let t = this.superReady;
      ((this.superCharge = Math.min(1, this.superCharge + (e * rate) / this.def.superCharge)),
        !t && this.superReady && this.isPlayer && this.game.audio.play(`ready`));
    }
    takeDamage(e, t, n = !1, context = null) {
      if (!this.alive || this.airborne || this.spawnT > 0) return 0;
      if (this.def.id === `ello` && this.parryT > 0 && t && context?.kind === `projectile`) {
        let faceX = Math.sin(this.facing),
          faceZ = Math.cos(this.facing),
          incoming = context.dirX * faceX + context.dirZ * faceZ;
        if (incoming < -0.25) {
          this.parryT = 0;
          context.parried = !0;
          this.addCharge(140);
          if (this.iaidoState) {
            this.iaidoState.empowered = !0;
            this.recoil = 1;
            this.game.effects.impact(this.x + faceX * 0.7, 0.72, this.z + faceZ * 0.7, this.superColor, 12);
            this.game.audio.play(`zap`, this.x, this.z);
            return 0;
          }
          // The katana counters in its actual arc, never damages a distant shooter remotely.
          this.attackSerial++;
          this.recoil = 1;
          this.game.combat.slash(this, faceX, faceZ, {
            ...this.def.super, kind: `melee`, damage: this.def.super.counterDamage,
          }, !0);
          this.game.effects.impact(this.x + faceX * 0.7, 0.72, this.z + faceZ * 0.7, this.superColor, 12);
          this.game.audio.play(`zap`, this.x, this.z);
          return 0;
        }
      }
      (t && !t.isPlayer && (e *= this.isPlayer ? this.game.difficulty.damage : 0.34),
        this.shieldT > 0 && (e *= 0.35),
        t && ((this.lastAttacker = t), (this.lastHitTime = this.game.elapsed)),
        (e = Math.round(e)));
      let r = Math.min(this.hp, e);
      return (
        (this.hp -= e),
        (this.lastCombat = this.game.elapsed),
        (this.regenT = 0),
        (this.flash = 1),
        (this.squash = 1),
        (this.revealT = Math.max(this.revealT, 0.9)),
        this.def.id === `titan` && t && t !== this && this.addCharge(e * 0.35),
        (!this.hidden || this.isPlayer) &&
          this.game.hud.floatText(this.x, 1.7, this.z, `${e}`, this.isPlayer ? `dmg-self` : `dmg`),
        t && t !== this && (t.addCharge(r), (t.lastCombat = this.game.elapsed)),
        n || this.game.audio.play(`hit`, this.x, this.z),
        this.isPlayer && this.game.onPlayerHurt(e),
        this.hp <= 0 && this.die(t),
        r
      );
    }
    heal(e) {
      if (!this.alive || this.hp >= this.maxHp) return;
      let t = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + e);
      let n = Math.round(this.hp - t);
      n > 0 &&
        (!this.hidden || this.isPlayer) &&
        (this.game.hud.floatText(this.x, 1.7, this.z, `+${n}`, `heal`), this.game.effects.healPuff(this.x, this.z));
    }
    canUseHeldItem() {
      if (!this.alive || !this.heldItem) return !1;
      switch (this.heldItem) {
        case `shield`:
          return this.shieldT <= 0;
        case `speed`:
          return this.itemSpeedT <= 0;
        case `heal`:
          return this.hp < this.maxHp;
        case `ammo`:
          return this.usesAmmo ? this.ammo < 3 : !this.superReady;
        case `super`:
          return !this.superReady;
        default:
          return !1;
      }
    }
    useHeldItem() {
      if (!this.canUseHeldItem()) return !1;
      let item = this.heldItem,
        names = { shield: `Shield`, speed: `Speed boost`, heal: `Medkit`, ammo: this.usesAmmo ? `Ammo refill` : `Focus`, super: `Super charger` };
      this.heldItem = null;
      switch (item) {
        case `shield`:
          this.shieldT = 3;
          break;
        case `speed`:
          this.itemSpeedT = 4;
          break;
        case `heal`:
          this.heal(this.maxHp * 0.35);
          break;
        case `ammo`:
          if (this.usesAmmo) ((this.ammo = 3), (this.reloadT = 0));
          else this.addCharge(this.def.superCharge * 0.2, 1);
          break;
        case `super`:
          this.addCharge(this.def.superCharge * 0.25, 1);
          break;
      }
      ((this.squash = -1),
        this.game.effects.burst(this.x, 0.7, this.z, this.superColor, 10, 3),
        this.game.audio.play(`pickup`, this.x, this.z),
        this.isPlayer && this.game.hud.toast(`${names[item]} used`));
      return !0;
    }
    updateBotItem() {
      if (this.isPlayer || !this.heldItem || !this.canUseHeldItem()) return;
      let nearest = 1 / 0;
      for (let other of this.game.brawlers)
        other !== this && other.alive && (nearest = Math.min(nearest, Math.hypot(other.x - this.x, other.z - this.z)));
      let health = this.hp / this.maxHp,
        use =
          (this.heldItem === `heal` && health <= 0.58) ||
          (this.heldItem === `shield` && health <= 0.72 && nearest <= 4) ||
          (this.heldItem === `speed` && nearest > 3.5 && nearest < 12) ||
          (this.heldItem === `ammo` && (this.usesAmmo ? this.ammo <= 1 : this.superCharge <= 0.9)) ||
          (this.heldItem === `super` && !this.superReady && this.superCharge <= 0.75 && nearest < 8);
      use && this.useHeldItem();
    }
    addCube() {
      if (this.game.modeName === `deathmatch` && this.cubes >= this.game.mode.powerUpCap) return !1;
      this.cubes++;
      let e = this.hp / this.maxHp;
      ((this.maxHp += Lc.cubeHp),
        (this.hp = Math.min(this.maxHp, Math.round(this.maxHp * e) + Lc.cubeHp * 0.5)),
        (this.squash = -1));
      return !0;
    }
    die(e) {
      this.alive &&
        ((this.alive = !1),
        (this.hp = 0),
        (this.deadT = 0),
        (this.burst = null),
        (this.leap = null),
        (this.dash = null),
         (this.parryT = 0),
         (this.slowT = 0),
         (this.speedBoostT = 0),
         (this.itemSpeedT = 0),
         (this.shieldT = 0),
         (this.heldItem = null),
         (this.isCharging = !1),
         (this.chargeLevel = 0),
         (this.iaidoState = null),
         (this.meleeLunge = null),
         (this.comboStep = 0),
         (this.comboResetT = 0),
        e && e !== this && e.kills++,
        this.game.onBrawlerDown(this, e));
    }
    update(e) {
      let t = this.game,
        n = this.model;
      if (!this.alive) {
        this.deadT += e;
        if (t.modeName === `deathmatch` && t.state === `playing` && this.deadT >= t.mode.respawnDelay) {
          t.respawnBrawler(this);
          return;
        }
        let fade = $c(1 - this.deadT / 0.32, 0, 1);
        (this.root.scale.setScalar(fade), (this.root.rotation.y += e * 14), fade <= 0 && (this.root.visible = !1));
        return;
      }
      if (
        ((this.spawnT = Math.max(0, this.spawnT - e)),
        (this.parryT = Math.max(0, this.parryT - e)),
        (this.slowT = Math.max(0, this.slowT - e)),
        (this.speedBoostT = Math.max(0, this.speedBoostT - e)),
        (this.itemSpeedT = Math.max(0, this.itemSpeedT - e)),
        (this.shieldT = Math.max(0, this.shieldT - e)),
        this.game.state === `playing` && this.updateBotItem(),
        this.game.state === `playing` &&
        Math.hypot(this.moveX, this.moveZ) < 0.08 &&
        this.vel.lengthSq() < 0.08 &&
        this.knock.lengthSq() < 0.04
          ? (this.stationaryT = Math.min(1, this.stationaryT + e))
          : (this.stationaryT = 0),
        (this.fireCooldown = Math.max(0, this.fireCooldown - e)),
        this.comboResetT > 0 && ((this.comboResetT = Math.max(0, this.comboResetT - e)), this.comboResetT === 0 && (this.comboStep = 0)),
        (this.aimHold = Math.max(0, this.aimHold - e)),
        (this.revealT = Math.max(0, this.revealT - e)),
        (this.flash = Math.max(0, this.flash - e * 7)),
        (this.recoil = nl(this.recoil, 0, 14, e)),
        this.slashAnim && (this.slashAnim.t += e),
        (this.punch[0] = nl(this.punch[0], 0, 16, e)),
        (this.punch[1] = nl(this.punch[1], 0, 16, e)),
        (this.squash = nl(this.squash, 0, 12, e)),
        this.usesAmmo && this.ammo < 3
          ? ((this.reloadT += e / this.def.reload),
            this.reloadT >= 1 && ((this.reloadT = 0), (this.ammo = Math.min(3, this.ammo + 1))))
          : (this.reloadT = 0),
        this.burst)
      ) {
        let t = this.burst;
        for (t.timer -= e; t.timer <= 0 && t.left > 0;) (this.fireBurstShot(), t.left--, (t.timer += t.a.interval));
        (t.left <= 0 && (this.burst = null), (this.aimHold = Math.max(this.aimHold, 0.35)));
      }
      if (this.iaidoState && this.parryT <= 0) {
        let iaido = this.iaidoState,
          attack = iaido.attack,
          dashAttack = {
            kind: `dash`,
            pathSlash: !0,
            iaido: !0,
            range: attack.dashRange,
            flight: attack.dashDuration,
            damage: iaido.empowered ? attack.parryDamage : attack.baseDamage,
            radius: attack.slashRadius,
            arc: attack.arc,
            color: attack.color,
            breaksWalls: !1,
        };
        this.iaidoState = null;
        this.slashAnim = {
          t: 0,
          duration: attack.dashDuration + 0.2,
          step: 2,
          isSuper: !0,
        };
        this.slashTrailT = 0;
        this.knock.set(0, 0);
        if (!this.startDash(dashAttack, iaido.dx, iaido.dz, iaido.targetX, iaido.targetZ))
          t.combat.slash(this, iaido.dx, iaido.dz, { ...dashAttack, kind: `melee`, range: 1.15 }, !0);
      }
      if (this.knockbackImmune) this.knock.set(0, 0);
      let r = this.root.position;
      if (this.dash) {
        let dash = this.dash;
        dash.t += e;
        let amount = $c(dash.t / dash.duration, 0, 1);
        amount = amount * amount * (3 - 2 * amount);
        ((r.x = el(dash.sx, dash.tx, amount)),
          (r.z = el(dash.sz, dash.tz, amount)),
          this.vel.set(dash.dx * 5, dash.dz * 5),
          t.world.resolveCircle(r, Ic));
        if (dash.t >= dash.duration) {
          this.dash = null;
          this.vel.set(0, 0);
          this.squash = 1.1;
          if (dash.attack.pathSlash) t.combat.dashSlash(this, dash, dash.attack);
          else t.combat.slash(this, dash.dx, dash.dz, { ...dash.attack, range: 1.35 }, !0);
        }
      } else if (this.leap) {
        let i = this.leap;
        i.t += e;
        let gravity = i.gravity || 1,
          duration = i.a.flight / Math.sqrt(gravity),
          a = $c(i.t / duration, 0, 1);
        ((r.x = el(i.sx, i.tx, a)),
          (r.z = el(i.sz, i.tz, a)),
          (r.y = Math.sin(a * Math.PI) * 3.4 / gravity),
          (n.body.rotation.x = a * Math.PI * 2),
          (this.aimAngle = Math.atan2(i.tx - i.sx, i.tz - i.sz)),
          (this.aimHold = 0.3),
          a >= 1 &&
            ((r.y = 0),
            (n.body.rotation.x = 0),
            (this.leap = null),
            (this.squash = 1.4),
            t.world.resolveCircle(r, Ic),
            t.combat.explode(r.x, r.z, i.a, this, !0, !0)));
      } else {
        let world = t.world,
          gameplay = world.biomeGameplay,
          surface = world.surfaceAt(r.x, r.z),
          n = this.def.speed * (gameplay?.moveMultiplier ?? 1);
        (this.def.terrainAffinity?.type === `bush` &&
          world.isBushAt(r.x, r.z) &&
          (n *= this.def.terrainAffinity.moveMultiplier),
          this.itemSpeedT > 0 && (n *= 1.35),
          this.speedBoostT > 0 && (n *= 1.15),
          this.slowT > 0 && (n *= 0.85),
          this.isCharging && this.def.id === `syafiah` && (n *= 0.88),
          this.burst && this.burst.a.kind !== `melee` && (n *= 0.82),
          t.state === `countdown` && (n = 0),
          surface === BIOME_SURFACE.MUD && (n *= gameplay?.mudMoveMultiplier ?? 1));
        if (surface === BIOME_SURFACE.ICE) {
          let traction = (gameplay?.iceFriction ?? gameplay?.friction ?? 1) *
              (this.def.terrainAffinity?.type === `ice` ? this.def.terrainAffinity.tractionMultiplier : 1),
            blend = 1 - Math.exp(-18 * Math.max(0.05, traction) * e);
          ((this.vel.x += (this.moveX * n - this.vel.x) * blend), (this.vel.y += (this.moveZ * n - this.vel.y) * blend));
        } else this.vel.set(this.moveX * n, this.moveZ * n);
        let i = this.knock.x,
          a = this.knock.y;
        ((r.x += (this.vel.x + i) * e), (r.z += (this.vel.y + a) * e));
        if (this.meleeLunge) {
          let lunge = this.meleeLunge,
            amount = Math.min(lunge.remaining, lunge.speed * e);
          ((r.x += lunge.dx * amount), (r.z += lunge.dz * amount));
          lunge.remaining -= amount;
          lunge.remaining <= 0 && (this.meleeLunge = null);
        }
        let o = Math.exp(-7 * (gameplay?.friction ?? 1) * e);
        (this.knock.multiplyScalar(o), t.world.resolveCircle(r, Ic));
      }
      let hazardDamage = t.world.hazardDamageAt(r.x, r.z);
      if (!this.airborne && hazardDamage > 0) {
        if (((this.hazardTime += e), this.hazardTime >= 0.2)) {
          let elapsed = this.hazardTime;
          ((this.hazardTime %= 0.2), this.takeDamage(Math.max(1, Math.round(hazardDamage * elapsed)), null, !0));
          if (!this.alive) return;
        }
      } else this.hazardTime = 0;
      let i = this.vel.lengthSq() > 0.2 && !this.leap && !this.dash,
        a = this.aimHold > 0 ? this.aimAngle : i ? Math.atan2(this.vel.x, this.vel.y) : this.facing;
      ((this.facing = il(this.facing, a, this.aimHold > 0 ? 26 : 13, e)), (this.root.rotation.y = this.facing));
      let o = this.inBush;
      ((this.inBush = !this.leap && !this.dash && t.world.isBushAt(r.x, r.z)),
        this.inBush !== o && (!this.hidden || this.isPlayer) && t.effects.leaves(r.x, r.z, 5),
        t.elapsed - this.lastCombat > 3 &&
          this.hp < this.maxHp &&
          ((this.regenT += e), this.regenT >= 1 && ((this.regenT = 0), this.heal(Math.round(this.maxHp * 0.13)))),
        this.animate(e, i));
    }
    animate(e, t) {
      let n = this.model,
        r = this.game.elapsed,
        i = this.vel.length();
      t &&
        ((this.walkPhase += e * i * 3.3),
        Math.sin(this.walkPhase) * Math.sin(this.walkPhase - e * i * 3.3) < 0 &&
          (!this.hidden || this.isPlayer) &&
          !this.inBush &&
          this.game.effects.footDust(this.x, this.z));
      let a = t ? Math.sin(this.walkPhase) * 0.8 : 0;
      ((n.legs[0].rotation.x = nl(n.legs[0].rotation.x, a, 20, e)),
        (n.legs[1].rotation.x = nl(n.legs[1].rotation.x, -a, 20, e)));
      let o = t ? Math.abs(Math.cos(this.walkPhase)) * 0.05 : Math.sin(r * 2.3 + this.id) * 0.012,
        s = this.squash;
      ((n.body.position.y = o - Math.max(0, s) * 0.07),
        n.body.scale.set(1 + s * 0.09, 1 - s * 0.11, 1 + s * 0.09),
        this.leap || (n.body.rotation.x = (t ? 0.13 + (n.pose.runLean || 0) : 0) - this.recoil * 0.2),
        (n.head.rotation.z = t ? Math.sin(this.walkPhase) * 0.05 : 0));
      if (this.def.id !== `ello`)
        n.weapon.position.z =
          (n.weapon.userData.baseZ ?? (n.weapon.userData.baseZ = n.weapon.position.z)) - this.recoil * 0.17 - this.chargeLevel * 0.08;
      if (n.electricCore) {
        let t = 1 + Math.sin(r * 13) * 0.08 + this.recoil * 0.32;
        (n.electricCore.scale.setScalar(t), (n.electricCore.rotation.z += e * (5 + this.recoil * 12)));
      }
      if (this.def.id === `ello`) {
        let weapon = n.weapon,
          baseX = weapon.userData.baseX ?? (weapon.userData.baseX = weapon.position.x),
          baseY = weapon.userData.baseY ?? (weapon.userData.baseY = weapon.position.y),
          baseZ = weapon.userData.baseZ ?? (weapon.userData.baseZ = weapon.position.z),
          slash = this.slashAnim,
          yaw = -0.3,
          pitch = 0,
          roll = 0,
          lift = 0;
        if (slash) {
          let p = $c(slash.t / slash.duration, 0, 1),
            direction = slash.step === 1 ? -1 : 1,
            startYaw = -direction * (slash.step === 2 ? 1.7 : 1.42),
            endYaw = direction * (slash.step === 2 ? 1.2 : 0.96);
          if (p < 0.25) {
            let u = p / 0.25;
            u = u * u * (3 - 2 * u);
            yaw = el(-0.3, startYaw, u);
            pitch = el(0, slash.step === 2 ? -0.9 : -0.16, u);
            lift = Math.sin(u * Math.PI * 0.5) * (slash.step === 2 ? 0.2 : 0.1);
          } else if (p < 0.67) {
            let u = (p - 0.25) / 0.42;
            u = 1 - Math.pow(1 - u, 3);
            yaw = el(startYaw, endYaw, u);
            pitch = el(slash.step === 2 ? -0.9 : -0.16, slash.step === 2 ? 0.38 : 0.12, u);
            roll = direction * Math.sin(u * Math.PI) * 0.24;
            lift = el(slash.step === 2 ? 0.2 : 0.1, -0.04, u);
          } else {
            let u = (p - 0.67) / 0.33;
            u = u * u * (3 - 2 * u);
            yaw = el(endYaw, -0.3, u);
            pitch = el(slash.step === 2 ? 0.38 : 0.12, 0, u);
            lift = el(-0.04, 0, u);
          }
          weapon.position.set(baseX + Math.sin(yaw) * 0.07, baseY + lift, baseZ - Math.max(0, Math.cos(yaw)) * 0.035);
          weapon.rotation.set(pitch, yaw, roll);
          n.body.rotation.y = -yaw * 0.18;
          n.head.rotation.y = yaw * 0.06;

          if (p >= 0.25 && p <= 0.72) {
            this.slashTrailT -= e;
            if (this.slashTrailT <= 0) {
              this.slashTrailT = 0.022;
              weapon.updateWorldMatrix(!0, !1);
              let color = slash.isSuper ? this.superColor : this.lightColor;
              this.slashTip.set(0, 0, 0.82);
              weapon.localToWorld(this.slashTip);
              this.game.effects.trail(this.slashTip.x, this.slashTip.y, this.slashTip.z, color, slash.isSuper ? 0.34 : 0.25);
              this.slashTip.set(0, 0, 0.52);
              weapon.localToWorld(this.slashTip);
              this.game.effects.trail(this.slashTip.x, this.slashTip.y, this.slashTip.z, color, slash.isSuper ? 0.25 : 0.17);
            }
          }
          if (slash.t >= slash.duration) this.slashAnim = null;
        } else {
          weapon.position.set(baseX, baseY, baseZ);
          weapon.rotation.set(this.parryT > 0 ? -0.18 : 0, this.parryT > 0 ? -1.1 : -0.3, this.parryT > 0 ? 0.65 : 0);
          n.body.rotation.y = nl(n.body.rotation.y, 0, 16, e);
          n.head.rotation.y = nl(n.head.rotation.y, 0, 16, e);
        }
      } else if (this.def.id === `naka`) {
        n.weapon.rotation.y = this.recoil * -1.2;
        n.weapon.scale.setScalar(this.recoil > 0.65 ? 0.15 : 1);
      } else if (n.weapon.userData.bowRig) {
        let rig = n.weapon.userData.bowRig, pull = this.chargeLevel * 0.28;
        rig.userData.strings.forEach((string, index) => {
          let side = index === 0 ? -1 : 1;
          string.position.set(side * 0.23, 0, -0.1 - pull / 2);
          string.scale.x = Math.hypot(0.46, pull);
          string.rotation.y = side * Math.atan2(pull, 0.46);
        });
        rig.userData.arrow.position.z = 0.25 - pull;
        rig.userData.arrow.visible = (!this.usesAmmo || this.ammo >= 1) && this.recoil < 0.4;
        n.arms[1].rotation.x = -1.1 + this.chargeLevel * 0.6;
      }
      let c = n.pose.armBase;
      if (this.def.id === `ello`) {
        let slash = this.slashAnim;
        if (slash) {
          let p = $c(slash.t / slash.duration, 0, 1),
            direction = slash.step === 1 ? -1 : 1,
            cut = p < 0.25 ? p / 0.25 : p < 0.67 ? (p - 0.25) / 0.42 : 1 - (p - 0.67) / 0.33;
          cut = $c(cut, 0, 1);
          n.arms[0].rotation.x = c[0][0] - 0.18 - cut * 0.22;
          n.arms[1].rotation.x = c[1][0] - 0.3 - cut * 0.34;
          n.arms[0].rotation.z = c[0][1] - direction * (0.18 + cut * 0.34);
          n.arms[1].rotation.z = c[1][1] - direction * (0.26 + cut * 0.52);
        } else if (this.parryT > 0) {
          n.arms[0].rotation.x = c[0][0] - 0.35;
          n.arms[1].rotation.x = c[1][0] - 0.5;
          n.arms[0].rotation.z = c[0][1] + 0.28;
          n.arms[1].rotation.z = c[1][1] - 0.42;
        } else {
          n.arms[0].rotation.x = c[0][0] + (t ? -a * 0.55 : 0);
          n.arms[1].rotation.x = c[1][0] + (t ? a * 0.25 : 0);
          n.arms[0].rotation.z = nl(n.arms[0].rotation.z, c[0][1], 18, e);
          n.arms[1].rotation.z = nl(n.arms[1].rotation.z, c[1][1], 18, e);
        }
      } else if (n.pose.punch)
        for (let e = 0; e < 2; e++) {
          let r = this.punch[e];
          ((n.arms[e].rotation.x = c[e][0] - r * 0.75 + (t ? Math.sin(this.walkPhase + e * Math.PI) * 0.25 : 0)),
            (n.arms[e].position.z = r * 0.42));
        }
      else
        n.pose.swingLeft &&
          ((n.arms[0].rotation.x = c[0][0] + (t ? -a * 0.7 : 0)),
          (n.arms[1].rotation.x = c[1][0] - this.recoil * 1.1 - this.chargeLevel * 0.22));
      let l = this.flash;
      for (let e of n.flashMats)
        e.emissive.setRGB(l + this.chargeLevel * 0.3, l * 0.92 + this.chargeLevel * 0.2, l * 0.85 + this.chargeLevel * 0.08);
      let u = this.root.position.y;
      ((this.ring.position.y = 0.04 - u),
        (this.superRing.position.y = 0.045 - u),
        this.disc && (this.disc.position.y = 0.035 - u));
      if (this.spawnT > 0) {
        this.ring.material.color.set(0x8dffb0);
        this.ring.material.opacity = 0.58 + Math.sin(r * 18) * 0.24;
        this.ring.scale.setScalar(1.18 + Math.sin(r * 12) * 0.08);
      } else {
        this.ring.material.color.copy(this.ringColor);
        this.ring.material.opacity = 0.92;
        this.ring.scale.setScalar(1);
      }
      let d = this.superReady,
        f = this.superRing.material;
      ((f.opacity = nl(f.opacity, d ? 0.55 + Math.sin(r * 6) * 0.25 : 0, 8, e)),
        (this.superRing.visible = f.opacity > 0.01),
        (this.superRing.rotation.y = -this.facing));
    }
    dispose() {
      this.game.scene.remove(this.root);
      for (let e of this.model.allMats) e.dispose();
      (this.ring.material.dispose(), this.superRing.material.dispose(), this.disc && this.disc.material.dispose());
    }
  },
  pu = new Re(),
  mu = new _e(),
  hu = new H(),
  gu = new H(),
  _u = new Ke(),
  vu = new J(),
  yu = 0.64,
  bu = 360;
