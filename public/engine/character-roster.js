// Gameplay-owned roster extensions and balance metadata. Kept outside the
// bundled Three.js file so character updates never modify the vendor runtime.
function createBalancedBotRoster(characterIds, count, seed = 0) {
  const ids = [...new Set(characterIds)].filter(Boolean);
  const limit = 2;
  if (count > ids.length * limit) throw new RangeError('Bot count exceeds the two-per-character roster limit.');
  let state = ((seed | 0) ^ 0x51ed270b) >>> 0;
  const nextRandom = () => {
    let value = (state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const counts = new Map();
  const roster = [];
  while (roster.length < count) {
    const available = ids.filter((id) => (counts.get(id) || 0) < limit);
    const characterId = available[Math.floor(nextRandom() * available.length)];
    if (!characterId) throw new RangeError('Cannot create a bot roster without available characters.');
    roster.push(characterId);
    counts.set(characterId, (counts.get(characterId) || 0) + 1);
  }
  return roster;
}

(() => {
  const ratings = {
    dusty: [4, 3, 4, 2],
    ace: [3, 3, 3, 5],
    fuse: [2, 3, 4, 4],
    titan: [5, 4, 4, 1],
    volt: [3, 4, 4, 4],
    naka: [2, 5, 3, 3],
    ello: [4, 3, 4, 1],
    syafiah: [2, 3, 4, 5],
  };
  const passives = {
    dusty: 'Close Scatter: 3 pellets on one target restores 0.25s of reload.',
    ace: 'Steady Aim: stay still for 0.45s to deal 10% more damage on the next volley.',
    fuse: 'Afterburn: explosions slow nearby enemies by 15% for 1s.',
    titan: 'Grit: damage from opponents builds extra Super charge.',
    volt: 'Focus Current: repeated electric hits on one target build a small Super bonus.',
    naka: 'Shadow Return: a returning shuriken hit boosts movement speed by 15% for 1.5s. Forest: +8% move speed in bushes.',
    ello: 'Perfect Reach: outer-arc katana hits grant extra Super charge. Samurai Poise: resists 65% of knockback.',
    syafiah: 'Quickdraw: release near 0.75s for 10% bonus damage. Low Gravity: +10% arrow range.',
  };
  for (const [id, def] of Object.entries(Bc)) {
    def.stats = {
      durability: ratings[id][0],
      agility: ratings[id][1],
      damage: ratings[id][2],
      range: ratings[id][3],
    };
    def.passive = passives[id];
  }
  Bc.naka = {
    id: 'naka',
    name: 'Naka',
    role: 'Ninja',
    blurb: 'A fast skirmisher. Fan three returning shuriken, then dash through danger with Shadow Rush.',
    hp: 3200,
    speed: 3.9,
    reload: 1.05,
    preferred: 4.2,
    palette: { body: 0x414e4a, accent: 0x87958c, skin: 0xf2c8a8, dark: 0x182220 },
    superCharge: 3500,
    stats: { durability: 2, agility: 5, damage: 3, range: 3 },
    passive: passives.naka,
    terrainAffinity: { type: 'bush', moveMultiplier: 1.08 },
    attack: {
      kind: 'spread',
      pellets: 3,
      spread: 0.24,
      range: 7.0,
      speed: 24,
      damage: 280,
      radius: 0.16,
      returning: true,
      returnDamageMultiplier: 0.5,
      projectile: 'shuriken',
      color: 0x50f1d2,
    },
    super: {
      kind: 'dash',
      pathSlash: true,
      range: 6.0,
      flight: 0.22,
      arc: 2.4,
      damage: 900,
      radius: 0.72,
      color: 0x9affdf,
      breaksWalls: false,
    },
  };
  Bc.ello = {
    id: 'ello',
    name: 'Ello',
    role: 'Samurai',
    blurb: 'Chain a three-hit katana combo. Iaido guards briefly, then dashes into a wide slash.',
    hp: 5500,
    speed: 3.30,
    reload: 1,
    preferred: 1.8,
    palette: { body: 0x19232e, accent: 0xa82d26, skin: 0xf0c59e, dark: 0x17191e },
    superCharge: 3500,
    stats: { durability: 4, agility: 3, damage: 4, range: 1 },
    passive: passives.ello,
    terrainAffinity: { type: 'ice', tractionMultiplier: 1.2 },
    knockbackResistance: 0.65,
    attack: {
      kind: 'melee',
      count: 1,
      interval: 0.12,
      range: 2.9,
      speed: 15,
      damage: 550,
      radius: 0.52,
      arc: 1.35,
      knockback: 1.4,
      combo: [
        { damage: 550, recovery: 0.34, lunge: 0.35 },
        { damage: 650, recovery: 0.34, lunge: 0.40 },
        { damage: 800, recovery: 0.46, lunge: 0.50 },
      ],
      comboReset: 0.75,
      lungeDuration: 0.13,
      color: 0xffcf6a,
    },
    super: {
      kind: 'iaido',
      guardDuration: 0.45,
      dashRange: 5.5,
      dashDuration: 0.20,
      baseDamage: 1100,
      parryDamage: 1500,
      slashRadius: 0.80,
      range: 5.5,
      arc: 2.4,
      color: 0xffdc75,
    },
  };
  Bc.syafiah = {
    id: 'syafiah',
    name: 'Syafiah',
    role: 'Archer',
    blurb: 'Release quick arrows or charge a precise shot. Arrow Shower controls a target area.',
    hp: 2900,
    speed: 3.2,
    reload: 1.35,
    preferred: 7.4,
    palette: { body: 0x396a3e, accent: 0xb89a54, skin: 0xecc9ad, dark: 0x233c2b },
    superCharge: 3600,
    stats: { durability: 2, agility: 3, damage: 4, range: 5 },
    passive: passives.syafiah,
    terrainAffinity: { type: 'low-gravity', rangeMultiplier: 1.1 },
    attack: {
      kind: 'burst',
      count: 1,
      interval: 0.12,
      range: 12.5,
      speed: 30,
      damage: 1050,
      radius: 0.12,
      chargeTime: 0.70,
      shotRecovery: 0.45,
      quickDamage: 650,
      quickRange: 10,
      quickSpeed: 25,
      maxDamage: 1050,
      maxRange: 12.5,
      maxSpeed: 30,
      projectile: 'arrow',
      color: 0xffc56c,
    },
    super: {
      kind: 'arrow-shower',
      range: 10.5,
      areaRadius: 3.4,
      warningDelay: 0.45,
      waveCount: 5,
      waveDamage: 250,
      waveInterval: 0.35,
      projectileCount: 8,
      color: 0xfff0aa,
    },
  };
  Bc.ace = {
    ...Bc.ace,
    attack: { ...Bc.ace.attack, damage: 200, range: 8.2, noKnockback: true },
    super: { ...Bc.ace.super, damage: 220, breaksWalls: false, noKnockback: true },
  };
  Bc.titan = { ...Bc.titan, speed: 3.25, reload: 1.0 };

  // Reference-sheet identities. Geometry is owned by character-models.js;
  // these overrides are cosmetic and leave combat tuning intact.
  const identities = {
    dusty: { alias: 'Dusty', role: 'Shotgunner', visual: 'veteran',
      palette: { body: 0x922d36, accent: 0xe3463e, skin: 0xc99070, dark: 0x252833 },
      hair: 0x30252b, trim: 0xbaa794 },
    titan: { alias: 'Titan', role: 'Tank', visual: 'juggernaut',
      palette: { body: 0x65734d, accent: 0x93a078, skin: 0xd7a17f, dark: 0x292d32 },
      hair: 0x22232b, trim: 0x71513b },
    ace: { alias: 'Ace', role: 'Marksman', visual: 'gunslinger',
      palette: { body: 0xe4e9f0, accent: 0x3c6bc5, skin: 0xe1b091, dark: 0x222b3c },
      hair: 0x202337, trim: 0xdc493f },
    fuse: { alias: 'Fuse', role: 'Demolitionist', visual: 'tinkerer',
      palette: { body: 0xa74e23, accent: 0xff922e, skin: 0xdca079, dark: 0x303039 },
      hair: 0x593324, trim: 0x9a7050 },
    volt: { alias: 'Volt', role: 'Skirmisher', visual: 'runner',
      palette: { body: 0xf3c332, accent: 0xffdf67, skin: 0xc98f6c, dark: 0x232934 },
      hair: 0x29232a, trim: 0xe4e9f0 },
  };
  for (const [id, identity] of Object.entries(identities)) Object.assign(Bc[id], identity);
  Bc.volt.attack = { ...Bc.volt.attack, color: 0xffd43b };
  Bc.volt.super = { ...Bc.volt.super, color: 0xffed98 };
})();
