// Five reference-led, articulated models. Positive Z is the aim direction.
// Keep geometry on the existing animation pivots and merge by material so
// added costume detail does not turn every buckle into another draw call.
function buildReferenceBrawler(def, hueShift = 0) {
  const id = def.id;
  const tank = id === 'titan', runner = id === 'volt', bomber = id === 'fuse';
  const p = def.palette;
  const mats = {
    body: lu(p.body), accent: lu(p.accent), dark: lu(p.dark),
    skin: lu(p.skin, { roughness: 0.85 }), hair: lu(def.hair, { roughness: 0.95 }),
    trim: lu(def.trim), metal: lu(0x77818d, { metalness: 0.65, roughness: 0.42 }),
    black: lu(0x10151d), white: lu(0xf3eee4),
  };
  if (hueShift) {
    mats.body.color.offsetHSL(hueShift, 0, 0);
    mats.accent.color.offsetHSL(hueShift * 0.6, 0, 0);
  }
  const glowColor = id === 'ace' ? 0x5bafff : bomber ? 0xffae35 : 0xffd43b;
  const glow = lu(glowColor, { emissive: glowColor, emissiveIntensity: 1.2, roughness: 0.35 });
  const root = new ut(), body = new ut(), head = new ut(), weapon = new ut();
  root.name = `${def.name}-${def.alias}`;
  root.userData.visual = def.visual;
  root.add(body);
  body.add(head, weapon);
  const partNames = [];
  const mesh = (parent, name, geometry, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const part = new Ln(geometry, material);
    part.name = name;
    part.position.set(x, y, z);
    part.scale.set(sx, sy, sz);
    part.castShadow = material !== glow;
    part.receiveShadow = true;
    parent.add(part);
    partNames.push(name);
    return part;
  };
  const box = (parent, name, material, w, h, depth, x, y, z) => mesh(parent, name, ru(w, h, depth), material, x, y, z);
  const oval = (parent, name, material, radius, x, y, z, sx = 1, sy = 1, sz = 1) =>
    mesh(parent, name, eu(radius, 10, 8), material, x, y, z, sx, sy, sz);
  const link = (parent, name, material, from, to, radius, tip = radius, segments = 6) => {
    const start = new H(...from), end = new H(...to), direction = end.clone().sub(start);
    const part = mesh(parent, name, nu(tip, radius, direction.length(), segments), material);
    part.position.copy(start.add(end).multiplyScalar(0.5));
    part.quaternion.setFromUnitVectors(new H(0, 1, 0), direction.normalize());
    return part;
  };
  const panel = (parent, name, material, w, h, depth, x, y, z, tilt = 0) => {
    const part = box(parent, name, material, w, h, depth, x, y, z);
    part.rotation.z = tilt;
    return part;
  };
  const ring = (parent, name, material, radius, tube, x, y, z) =>
    mesh(parent, name, au(radius, tube), material, x, y, z);

  const hipY = runner ? 0.53 : tank ? 0.49 : 0.44;
  const shoulderY = tank ? 1.04 : runner ? 0.96 : 0.88;
  const halfWidth = tank ? 0.32 : bomber ? 0.225 : runner ? 0.165 : 0.20;
  const headY = tank ? 1.34 : runner ? 1.24 : bomber ? 1.12 : 1.18;
  const headRadius = tank ? 0.225 : runner ? 0.192 : bomber ? 0.219 : 0.205;
  head.position.y = headY;

  // The runner has long tapered legs; the tank has a wide, planted stance.
  const legs = [-1, 1].map((side) => {
    const leg = new ut();
    leg.position.set(side * (tank ? 0.20 : bomber ? 0.16 : 0.125), hipY, 0);
    const radius = tank ? 0.132 : runner ? 0.077 : 0.098;
    link(leg, 'trouser-thigh', mats.dark, [0, -0.02, 0], [0, -hipY * 0.52, 0], radius * 0.98, radius * 1.18);
    link(leg, 'trouser-calf', mats.dark, [0, -hipY * 0.49, 0], [0, -hipY + 0.15, 0], radius * 0.74, radius * 0.95);
    box(leg, 'knee-pad', tank ? mats.metal : mats.dark, radius * 1.7, 0.13, 0.055, 0, -hipY * 0.46, 0.082);
    oval(leg, runner ? 'running-shoe' : 'combat-boot', mats.dark, 0.12, 0, -hipY + 0.105, 0.044,
      tank ? 1.3 : 0.92, 0.7, runner ? 1.5 : 1.6);
    box(leg, 'sole', runner ? mats.trim : mats.black, tank ? 0.29 : 0.21, 0.045, 0.32, 0, -hipY + 0.036, 0.044);
    box(leg, 'toe-cap', tank ? mats.metal : mats.body, tank ? 0.26 : 0.185, 0.055, 0.1, 0, -hipY + 0.10, 0.16);
    box(leg, 'ankle-strap', mats.accent, radius * 1.95, 0.045, 0.17, 0, -hipY + 0.18, 0.025);
    if (runner) {
      link(leg, 'calf-conductor', mats.accent, [side * 0.065, -0.17, -0.02], [side * 0.065, -0.34, -0.02], 0.025);
      box(leg, 'heel-cell', glow, 0.055, 0.06, 0.04, 0, -hipY + 0.11, -0.125);
    }
    root.add(leg);
    return leg;
  });
  const torso = mesh(body, 'torso', nu(halfWidth * 1.04, halfWidth * 0.85, shoulderY - hipY, 8), mats.dark,
    0, (hipY + shoulderY) / 2, 0, 1, 1, tank ? 0.71 : 0.81);
  mesh(body, 'belt', nu(halfWidth, halfWidth, 0.075, 8), mats.black, 0, hipY + 0.025, 0, 1.06, 1, 0.89);
  box(body, 'belt-buckle', mats.metal, 0.095, 0.065, 0.045, 0, hipY + 0.025, 0.165);
  link(body, 'neck', mats.skin, [0, shoulderY - 0.02, 0], [0, headY - 0.14, 0], 0.084);
  const arms = [-1, 1].map((side) => {
    const arm = new ut();
    arm.position.set(side * (halfWidth + (tank ? 0.1 : 0.055)), shoulderY - 0.045, 0);
    link(arm, 'upper-arm', tank || bomber ? mats.skin : mats.body, [0, 0, 0], [0, -0.16, 0], tank ? 0.105 : 0.063);
    link(arm, 'forearm', tank ? mats.skin : mats.dark, [0, -0.16, 0], [0, -0.28, 0], tank ? 0.09 : 0.06);
    const hand = oval(arm, 'glove', mats.dark, tank ? 0.105 : 0.074, 0, -0.31, 0, 1, 1, 1.15);
    arm.userData.hand = hand;
    box(arm, 'wrist-guard', tank ? mats.metal : mats.accent, tank ? 0.23 : 0.13, 0.075, tank ? 0.23 : 0.125, 0, -0.24, 0);
    if (!runner) oval(arm, 'shoulder-armor', mats.body, tank ? 0.19 : 0.10, side * 0.015, 0, 0, 1.16, 0.7, 1.08);
    body.add(arm);
    return arm;
  });

  // Individually proportioned faces: no helmets hiding the reference identities.
  oval(head, 'face', mats.skin, headRadius, 0, 0, 0, tank ? 1.08 : 1, tank ? 1.06 : 1.13, 0.86);
  oval(head, 'jaw', mats.skin, headRadius * 0.7, 0, -headRadius * 0.47, 0.035,
    tank ? 1.4 : runner ? 0.86 : 1, 0.64, 0.91);
  for (const side of [-1, 1]) {
    oval(head, 'ear', mats.skin, 0.046, side * headRadius * 0.96, -0.012, 0, 0.6, 1, 0.75);
    oval(head, 'eye-white', mats.white, 0.041, side * headRadius * 0.42, 0.015, headRadius * 0.81, 1.17, 0.53, 0.3);
    oval(head, 'pupil', mats.black, 0.018, side * headRadius * 0.40, 0.011, headRadius * 0.88, 0.85, 0.86, 0.4);
    panel(head, 'eyebrow', mats.hair, runner ? 0.077 : 0.092, runner ? 0.019 : 0.027, 0.025,
      side * headRadius * 0.42, 0.049, headRadius * 0.89, side * (bomber ? 0.12 : 0.21));
  }
  oval(head, 'nose', mats.skin, 0.037, 0, -0.035, headRadius * 0.84, 0.68, 1, 1);
  panel(head, 'mouth', mats.hair, bomber ? 0.08 : 0.06, 0.012, 0.015,
    bomber ? 0.019 : 0, -0.099, headRadius * 0.76, bomber ? 0.14 : runner ? -0.12 : 0);
  mesh(head, runner ? 'cropped-hair' : 'hair-cap', iu(headRadius * 1.045, 0.49), mats.hair, 0, 0.046, -0.012, 1, 0.9, 1);
  if (runner) {
    for (let j = 0; j < 5; j++) {
      const x = (j - 2) * 0.063;
      link(head, 'swept-back-hair', mats.hair, [x, 0.17, 0.085], [x * 0.8 - 0.025, 0.27 + (2 - Math.abs(j - 2)) * 0.024, -0.24], 0.072, 0);
    }
    panel(head, 'temple-shave', mats.hair, 0.015, 0.065, 0.09, -0.187, 0.049, 0, -0.1);
  } else {
    const count = tank ? 7 : 8;
    for (let j = 0; j < count; j++) {
      const angle = j * Math.PI * 2 / count;
      const x = Math.sin(angle), z = Math.cos(angle);
      link(head, 'spiky-hair', mats.hair,
        [x * headRadius * 0.60, 0.125, z * headRadius * 0.6 - 0.025],
        [x * headRadius * (tank ? 0.78 : 1.21) + 0.025, (tank ? 0.31 : 0.25) + (j % 3) * 0.035, z * headRadius * 1.08 - 0.06],
        tank ? 0.074 : 0.081, 0);
    }
    if (id === 'ace' || bomber) {
      link(head, 'side-fringe', mats.hair, [-0.1, 0.18, 0.13], [-0.155, -0.006, 0.172], 0.085, 0);
      link(head, 'front-fringe', mats.hair, [0.06, 0.20, 0.10], [-0.045, 0.026, 0.186], 0.081, 0);
    }
  }
  const muzzles = [];
  const pose = { armBase: [[-1.3, 0.20], [-1.3, -0.20]], swingArms: false };
  const pouch = (x, y, z, width = 0.10) => {
    box(body, 'utility-pouch', mats.dark, width, 0.14, 0.10, x, y, z);
    box(body, 'pouch-flap', mats.trim, width * 0.9, 0.038, 0.017, x, y + 0.043, z + 0.054);
  };
  const coat = (material, hemMaterial, length) => {
    for (const side of [-1, 1]) {
      panel(body, 'coat-lapel', material, 0.11, 0.32, 0.045, side * 0.155, 0.73, 0.15, side * -0.16);
      panel(body, 'raised-collar', material, 0.115, 0.19, 0.07, side * 0.14, 0.985, -0.015, side * -0.32);
      const tail = panel(body, 'split-coat-tail', material, 0.17, length, 0.055,
        side * 0.19, hipY - length * 0.24, -0.105, side * 0.18);
      tail.rotation.x = -0.13;
      panel(body, 'coat-hem', hemMaterial, 0.17, 0.05, 0.06,
        side * (0.19 + length * 0.07), hipY - length * 0.72, -0.075, side * 0.18);
    }
    box(body, 'coat-back', material, 0.34, 0.33, 0.06, 0, 0.71, -0.16);
  };
  const barrel = (parent, x, y, z, length, radius, rimMaterial) => {
    link(parent, 'barrel', mats.metal, [x, y, z], [x, y, z + length], radius, radius, 10);
    ring(parent, 'muzzle-rim', rimMaterial, radius * 0.83, radius * 0.18, x, y, z + length + 0.005);
    oval(parent, 'muzzle-bore', mats.black, radius * 0.68, x, y, z + length + 0.007, 1, 1, 0.06);
  };
  const bomb = (parent, x, y, z, radius) => {
    oval(parent, 'segmented-bomb', mats.dark, radius, x, y, z);
    const band = ring(parent, 'bomb-band', mats.metal, radius * 0.94, radius * 0.08, x, y, z);
    band.rotation.y = Math.PI / 2;
    for (const side of [-1, 1]) oval(parent, 'bomb-cell', glow, radius * 0.28, x + side * radius * 0.87, y, z + radius * 0.18);
    oval(parent, 'bomb-cell', glow, radius * 0.31, x, y, z + radius * 0.93, 1, 1, 0.35);
    box(parent, 'bomb-trigger', mats.accent, radius * 0.7, radius * 0.28, radius * 0.6, x, y + radius, z);
  };

  if (id === 'dusty') {
    coat(mats.body, mats.dark, 0.38);
    const band = mesh(head, 'red-bandana', nu(headRadius * 1.045, headRadius * 1.045, 0.069, 12), mats.accent, 0, 0.095, 0, 1, 1, 0.92);
    band.rotation.z = -0.055;
    for (const side of [-1, 1]) link(head, 'bandana-tail', mats.accent, [0, 0.08, -0.18], [side * 0.15, -0.06, -0.39], 0.048, 0.012, 4);
    oval(head, 'goatee', mats.hair, 0.069, 0, -0.135, 0.125, 0.74, 0.7, 0.36);
    panel(head, 'cheek-scar', mats.trim, 0.045, 0.012, 0.012, 0.13, -0.035, 0.14, -0.55);
    for (let j = 0; j < 3; j++) {
      link(body, 'shotgun-shell', mats.accent, [-0.18 + j * 0.065, 0.47, 0.175], [-0.18 + j * 0.065, 0.58, 0.175], 0.023);
      box(body, 'shell-cap', mats.trim, 0.045, 0.025, 0.04, -0.18 + j * 0.065, 0.58, 0.175);
    }
    pouch(0.235, 0.44, 0.02);
    weapon.position.set(0.015, 0.77, 0.27);
    box(weapon, 'dustbreaker-receiver', mats.dark, 0.19, 0.18, 0.33, 0, 0, 0.13);
    box(weapon, 'receiver-red-panel', mats.accent, 0.2, 0.085, 0.17, 0, 0.016, 0.10);
    box(weapon, 'stock', mats.dark, 0.11, 0.14, 0.18, 0, -0.055, -0.09);
    for (const y of [-0.052, 0.056]) barrel(weapon, 0, y, 0.22, 0.43, y > 0 ? 0.070 : 0.051, mats.accent);
    box(weapon, 'pump-grip', mats.dark, 0.15, 0.065, 0.20, 0, -0.11, 0.31);
    muzzles.push(new H(0.015, 0.826, 0.94));
    pose.armBase = [[-1.35, 0.55], [-1.22, -0.38]];
  } else if (id === 'ace') {
    coat(mats.body, mats.accent, 0.52);
    box(body, 'dark-neck-guard', mats.dark, 0.22, 0.13, 0.10, 0, 0.985, 0.095);
    panel(body, 'chest-harness', mats.black, 0.055, 0.37, 0.035, 0, 0.74, 0.16, -0.55);
    box(body, 'harness-clasp', mats.trim, 0.07, 0.055, 0.025, 0, 0.735, 0.19);
    for (const side of [-1, 1]) {
      pouch(side * 0.22, 0.43, 0.055, 0.09);
      link(body, 'back-chevron', mats.accent, [0, 0.83, -0.196], [side * 0.10, 0.65, -0.196], 0.018);
    }
    weapon.position.set(0, 0.79, 0.30);
    for (const side of [-1, 1]) {
      const x = side * 0.245;
      box(weapon, 'apex-slide', mats.body, 0.09, 0.09, 0.29, x, 0.02, 0.17);
      box(weapon, 'apex-frame', mats.dark, 0.085, 0.055, 0.27, x, -0.035, 0.155);
      panel(weapon, 'pistol-grip', mats.black, 0.067, 0.14, 0.073, x, -0.097, 0.052, side * 0.06);
      box(weapon, 'pistol-energy-rail', glow, 0.025, 0.012, 0.14, x, 0.071, 0.19);
      box(weapon, 'pistol-safety', mats.trim, 0.095, 0.02, 0.04, x, 0.00, 0.08);
      barrel(weapon, x, 0.02, 0.29, 0.045, 0.037, mats.accent);
      muzzles.push(new H(x, 0.81, 0.642));
    }
    pose.armBase = [[-1.48, 0.05], [-1.48, -0.05]];
  } else if (bomber) {
    for (const side of [-1, 1]) {
      panel(body, 'work-vest', mats.body, 0.17, 0.30, 0.06, side * 0.14, 0.71, 0.13, side * 0.10);
      panel(body, 'vest-strap', mats.dark, 0.042, 0.28, 0.035, side * 0.16, 0.73, 0.17, side * 0.1);
      oval(head, 'goggle-frame', mats.black, 0.086, side * 0.105, 0.17, 0.145, 1, 0.76, 0.48);
      oval(head, 'amber-goggle-lens', mats.accent, 0.067, side * 0.105, 0.174, 0.181, 1, 0.72, 0.22);
      box(head, 'lens-glint', mats.white, 0.017, 0.039, 0.008, side * 0.105 - 0.015, 0.186, 0.197);
    }
    box(head, 'goggle-bridge', mats.metal, 0.07, 0.027, 0.038, 0, 0.175, 0.172);
    const scarf = ring(body, 'orange-scarf', mats.accent, 0.125, 0.066, 0, 0.955, 0);
    scarf.rotation.x = Math.PI / 2;
    panel(body, 'short-scarf-tail', mats.accent, 0.13, 0.23, 0.038, -0.14, 0.845, -0.17, -0.38);
    pouch(-0.255, 0.45, 0.04, 0.17);
    pouch(-0.105, 0.49, 0.18);
    pouch(0.05, 0.49, 0.18);
    bomb(body, 0.25, 0.47, 0.075, 0.096);
    box(arms[0], 'blast-forearm-plate', mats.body, 0.17, 0.17, 0.16, 0, -0.2, 0);
    link(body, 'tool-handle', mats.trim, [-0.28, 0.48, -0.10], [-0.28, 0.65, -0.10], 0.024);
    box(body, 'wrench-head', mats.metal, 0.09, 0.055, 0.035, -0.28, 0.66, -0.10);
    weapon.position.set(0.30, 0.79, 0.32);
    bomb(weapon, 0, 0, 0, 0.133);
    muzzles.push(new H(0.30, 0.83, 0.43));
    pose.armBase = [[-0.18, 0.16], [-1.40, -0.05]];
    pose.swingLeft = true;
  } else if (tank) {
    oval(body, 'chest-plate', mats.dark, 0.29, 0, 0.83, 0.075, 1.06, 0.76, 0.6);
    panel(body, 'leather-crossbelt', mats.trim, 0.105, 0.62, 0.05, 0, 0.84, 0.22, -0.76);
    box(body, 'crossbelt-buckle', mats.metal, 0.10, 0.095, 0.04, 0.06, 0.90, 0.26);
    for (let j = 0; j < 2; j++) {
      const side = j === 0 ? -1 : 1, arm = arms[j];
      oval(arm, 'massive-pauldron', mats.body, 0.19, side * 0.015, 0.04, 0, 1.10, 0.72, 1.02);
      box(arm, 'pauldron-ridge', mats.accent, 0.22, 0.045, 0.24, 0, 0.16, 0);
      box(arm, 'titan-gauntlet', mats.metal, 0.255, 0.22, 0.255, 0, -0.28, 0);
      box(arm, 'gauntlet-plate', mats.body, 0.27, 0.16, 0.075, 0, -0.29, 0.15);
      for (let knuckle = 0; knuckle < 3; knuckle++) {
        box(arm, 'armored-knuckle', mats.accent, 0.071, 0.078, 0.080, (knuckle - 1) * 0.079, -0.39, 0.085);
      }
      pouch(side * 0.28, 0.51, 0.05, 0.12);
    }
    muzzles.push(new H(-0.36, 0.80, 0.56), new H(0.36, 0.80, 0.56));
    pose.armBase = [[-0.85, 0.23], [-0.85, -0.23]];
    pose.punch = true;
  } else if (runner) {
    for (const side of [-1, 1]) {
      panel(body, 'track-jacket', mats.body, 0.125, 0.32, 0.045, side * 0.113, 0.77, 0.115, side * 0.06);
      panel(body, 'short-sport-collar', mats.body, 0.075, 0.085, 0.08, side * 0.074, 1.01, 0, side * -0.15);
      link(body, 'jacket-piping', mats.trim, [side * 0.13, 0.63, 0.145], [side * 0.13, 0.89, 0.145], 0.011);
    }
    box(body, 'zipper', mats.metal, 0.018, 0.28, 0.016, 0, 0.79, 0.14);
    box(body, 'flat-power-pack', mats.dark, 0.255, 0.25, 0.095, 0, 0.83, -0.16);
    box(body, 'power-pack-panel', mats.body, 0.19, 0.18, 0.018, 0, 0.83, -0.217);
    link(body, 'lightning-emblem-upper', glow, [0.038, 0.895, -0.232], [-0.029, 0.825, -0.232], 0.018);
    link(body, 'lightning-emblem-lower', glow, [0.025, 0.837, -0.232], [-0.04, 0.767, -0.232], 0.018);
    box(body, 'hip-cell', mats.dark, 0.06, 0.17, 0.085, -0.19, 0.54, 0);
    box(body, 'hip-cell-charge', glow, 0.065, 0.055, 0.045, -0.19, 0.55, 0.046);
    weapon.position.set(0, 0.85, 0.27);
    box(weapon, 'volt-driver-frame', mats.dark, 0.19, 0.135, 0.25, 0, -0.02, 0.09);
    box(weapon, 'volt-driver-shell', mats.body, 0.205, 0.055, 0.15, 0, 0.06, 0.045);
    const core = new ut();
    core.position.set(0, 0.0, 0.215);
    weapon.add(core);
    oval(core, 'electric-core', glow, 0.069, 0, 0, 0, 1, 1, 1.1);
    ring(core, 'core-cage', mats.accent, 0.09, 0.018, 0, 0, 0);
    for (const side of [-1, 1]) barrel(weapon, side * 0.088, 0, 0.18, 0.19, 0.033, glow);
    weapon.userData.electricCore = core;
    muzzles.push(new H(0, 0.85, 0.66));
    pose.armBase = [[-1.38, 0.18], [-1.38, -0.18]];
    pose.runLean = 0.10;
  }
  arms.forEach((arm, index) => {
    arm.rotation.x = pose.armBase[index][0];
    arm.rotation.z = pose.armBase[index][1];
  });
  root.userData.parts = partNames;
  const mergedBody = mergeBrawlerPivot(body, `${id}-reference-v1`, 'body');
  mergeBrawlerPivot(head, `${id}-reference-v1`, 'head');
  legs.forEach((leg, index) => mergeBrawlerPivot(leg, `${id}-reference-v1`, `leg-${index}`));
  arms.forEach((arm, index) => mergeBrawlerPivot(arm, `${id}-reference-v1`, `arm-${index}`));
  mergeBrawlerPivot(weapon, `${id}-reference-v1`, 'weapon');
  if (weapon.userData.electricCore) mergeBrawlerPivot(weapon.userData.electricCore, `${id}-reference-v1`, 'core');
  return { root, body, head, torso: mergedBody.get(torso) || torso, legs, arms, weapon, muzzles, pose,
    electricCore: weapon.userData.electricCore || null, flashMats: Object.values(mats), allMats: [...Object.values(mats), glow] };
}

