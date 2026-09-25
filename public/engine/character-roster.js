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
    skills: [{ id: 'smoke-bomb', name: 'Smoke Bomb', shortName: 'SMOKE', cooldown: 14, duration: 2, color: 0x59645f }, { id: 'kunai-dash', name: 'Kunai Dash', shortName: 'KUNAI', cooldown: 10, range: 6, damage: 280, speed: 24, recastWindow: 2, dashOffset: 0.85, color: 0xd9e1dc }],
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
    skills: [{ id: 'parry-stance', name: 'Parry Stance', shortName: 'PARRY', cooldown: 8, duration: 0.55, frontAngle: 120, empowerDuration: 2, color: 0xffdc75 }, { id: 'swift-flash', name: 'Swift Flash', shortName: 'FLASH', cooldown: 10, distance: 3.5, duration: 0.22, damage: 300, ccImmune: true, color: 0xffdc75 }],
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
    skills: [{ id: 'eagle-eye', name: 'Eagle Eye', shortName: 'EAGLE', cooldown: 14, duration: 5, zoomMultiplier: 1.2, pierceDestructibleCover: 1, color: 0xffd78a }, { id: 'caltrops-trap', name: 'Caltrops Trap', shortName: 'CALTROPS', cooldown: 11, retreatDistance: 2.2, trapDuration: 3, radius: 0.7, slow: 0.35, damagePerSecond: 80, damageDuration: 2, color: 0xd2bd83 }],
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
    skills: [{ id: 'piercing-bolt', name: 'Piercing Bolt', shortName: 'BOLT', cooldown: 8, range: 9, damage: 480, speed: 21, defenseBreak: 0.12, defenseBreakDuration: 2.5, piercePlayers: true, pierceCover: true, color: 0x89dcff }, { id: 'tactical-roll', name: 'Tactical Roll', shortName: 'ROLL', cooldown: 9, distance: 3, duration: 0.25, restoreAmmo: 1 }],
    super: { ...Bc.ace.super, damage: 220, breaksWalls: false, noKnockback: true },
  };
  Bc.dusty.skills = [{ id: 'combat-slide', name: 'Combat Slide', shortName: 'SLIDE', cooldown: 8, distance: 3.5, duration: 0.25, damageReduction: 0.25, restoreAmmo: 1 }, { id: 'concussive-shell', name: 'Concussive Shell', shortName: 'SHELL', cooldown: 10, range: 4, arc: 1.1, damage: 450, knockback: 4.5, wallStun: 0.6, color: 0xffa53a }];
  Bc.fuse.skills = [{ id: 'sticky-grenade', name: 'Sticky Grenade', shortName: 'STICKY', cooldown: 9, range: 4.5, fuse: 2, damage: 700, blast: 1.5, knockback: 2.5, speed: 10, attachToTarget: true, attachToCover: true, color: 0xff8d3d }, { id: 'smoke-screen', name: 'Smoke Screen', shortName: 'SMOKE', cooldown: 13, radius: 2.8, duration: 3.5, slow: 0.2, color: 0x828a84 }];
  Bc.titan = { ...Bc.titan, speed: 3.25, reload: 1.0, skills: [{ id: 'iron-charge', name: 'Iron Charge', shortName: 'CHARGE', cooldown: 9, distance: 4, duration: 0.38, damage: 300, knockback: 2.2, interrupt: true, color: 0xb9bd87 }, { id: 'taunt-echo', name: 'Taunt Echo', shortName: 'TAUNT', cooldown: 12, radius: 3.5, duration: 1.75, damageReduction: 0.3, slowAway: 0.3, color: 0xc1c89a }] };
  Bc.volt.skills = [{ id: 'chain-lightning', name: 'Chain Lightning', shortName: 'CHAIN', cooldown: 7, range: 6.5, damage: 350, jumpCount: 2, jumpRange: 2.5, jumpDamage: 250, interruptDuration: 0.17, color: 0xffdf55 }, { id: 'overcharge-volt', name: 'Overcharge Volt', shortName: 'OVERCHARGE', cooldown: 12, duration: 3, speedMultiplier: 1.15, projectileCount: 4, color: 0xffef9a }];

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
  Bc.gojo = {
    id: 'gojo', name: 'Gojo', alias: 'Gojo', role: 'Space Controller',
    blurb: 'Limitless Strike · Blue draws foes in · Red blasts them away.',
    hp: 3000, speed: 3.25, reload: 1, preferred: 3.2, maxAmmo: 0, superCharge: 3800,
    stats: { durability: 2, agility: 3, damage: 4, range: 4 },
    passive: 'Infinity Barrier: gain one barrier after 5 seconds without taking a hit.',
    visual: 'sorcerer', palette: { body: 0x171b28, dark: 0x10121c, accent: 0x345bff, skin: 0xeac4b3 },
    attack: {
      kind: 'melee', name: 'Limitless Strike', count: 1, interval: 0.12, damage: 350, range: 2.8, arc: 1.5, radius: 0.45,
      cooldown: 0.34, combo: [
        { damage: 350, pull: 0.3, recovery: 0.34 },
        { damage: 350, pull: 0.3, recovery: 0.34 },
        { damage: 600, push: 5, recovery: 0.46 },
      ], comboReset: 0.75, color: 0x4777ff,
    },
    skills: [
      { id: 'pull', name: 'Cursed Technique Lapse - Blue', shortName: 'BLUE', cooldown: 10, range: 7.5, radius: 2.4, damage: 300, slow: 0.3, duration: 2.4, pullSpeed: 3, color: 0x416cff },
      { id: 'repulse', name: 'Cursed Technique Reversal - Red', shortName: 'RED', cooldown: 11, range: 5, damage: 700, width: 0.55, knockback: 5.5, wallStun: 0.7, color: 0xff456d },
    ],
    super: { kind: 'gojo-domain', name: 'Domain Expansion - Infinite Void', range: 7.5, radius: 3.8, warningDelay: 0.5, duration: 4, freeze: 1.5, color: 0x617cff },
  };
  Bc.sukuna = {
    id: 'sukuna', name: 'Sukuna', alias: 'Sukuna', role: 'Aggressive Fire Mage',
    blurb: 'Cleave up close, cut through foes with Dismantle, then charge Fuga.',
    hp: 4200, speed: 3.25, reload: 1.1, preferred: 3.1, maxAmmo: 3, superCharge: 4000,
    stats: { durability: 4, agility: 3, damage: 5, range: 2 },
    passive: 'Reverse Cursed Technique: eliminations restore health and briefly increase movement speed.',
    visual: 'sorcerer', palette: { body: 0x21191f, dark: 0x101116, accent: 0x9e2437, skin: 0xd6a18c },
    attack: { kind: 'melee', name: 'Cleave', count: 1, interval: 0.12, damage: 450, range: 3, arc: 1.5, radius: 0.45, cooldown: 0.24, color: 0xf34255, sukunaBasic: true },
    skills: [
      { id: 'long-slash', name: 'Dismantle', shortName: 'DISMANTLE', cooldown: 7, range: 10, damage: 600, maxTargets: 3, width: 0.55, color: 0xe52d45 },
      { id: 'flame', name: 'Fuga - Kamino / Flame Arrow', shortName: 'FUGA', cooldown: 12, chargeTime: 1, range: 13.5, tapDamage: 500, tapRange: 9, chargedDamage: 1100, chargedRange: 13.5, blast: 1.8, burnDamage: 90, burnDuration: 3, projectileSpeed: 18, color: 0xff642e },
    ],
    super: { kind: 'sukuna-zone', name: 'Domain Expansion - Malevolent Shrine', range: 10.5, radius: 4.5, warningDelay: 0.45, duration: 4, waveCount: 8, waveInterval: 0.5, waveDamage: 180, breaksWalls: true, color: 0xe52d45 },
  };
})();
