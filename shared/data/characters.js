// Shared gameplay and identity data. Visual meshes and animation data stay in
// public/engine, but network gameplay and UI use this canonical roster.
export const CHARACTER_DEFS = Object.freeze({
  dusty: Object.freeze({ id: 'dusty', name: 'Athallah', speed: 3.15, reload: 1.35, maxHp: 3900, superCharge: 3000, attack: { kind: 'spread', count: 5, pellets: 5, damage: 330, speed: 15, range: 7, spread: 0.5, radius: 0.15, color: 0xffa53a, cooldown: 0.22 }, skills: [{ id: 'combat-slide', name: 'Combat Slide', shortName: 'SLIDE', cooldown: 8, distance: 3.5, duration: 0.25, damageReduction: 0.25, restoreAmmo: 1 }, { id: 'concussive-shell', name: 'Concussive Shell', shortName: 'SHELL', cooldown: 10, range: 4, arc: 1.1, damage: 450, knockback: 4.5, wallStun: 0.6, color: 0xffa53a }], super: { kind: 'spread', count: 9, pellets: 9, damage: 340, speed: 16, range: 8, spread: 0.85, radius: 0.2, color: 0xffe14a, knockback: 9, breaksWalls: true, cooldown: 0.2 } }),
  ace: Object.freeze({ id: 'ace', name: 'Zeyd', speed: 3.25, reload: 1.5, maxHp: 3000, superCharge: 3600, attack: { kind: 'burst', count: 6, damage: 200, speed: 19, range: 8.2, spread: 0.035, jitter: 0.035, interval: 0.08, radius: 0.13, color: 0x6fd5ff, cooldown: 0.6, noKnockback: true }, skills: [{ id: 'piercing-bolt', name: 'Piercing Bolt', shortName: 'BOLT', cooldown: 8, range: 9, damage: 480, speed: 21, defenseBreak: 0.12, defenseBreakDuration: 2.5, piercePlayers: true, pierceCover: true, color: 0x89dcff }, { id: 'tactical-roll', name: 'Tactical Roll', shortName: 'ROLL', cooldown: 9, distance: 3, duration: 0.25, restoreAmmo: 1 }], super: { kind: 'burst', count: 12, damage: 220, speed: 21, range: 11.5, spread: 0.05, jitter: 0.05, interval: 0.06, radius: 0.2, color: 0xfff07a, pierce: true, breaksWalls: false, noKnockback: true, cooldown: 0.2 } }),
  fuse: Object.freeze({ id: 'fuse', name: 'Azka', speed: 3, reload: 1.55, maxHp: 2900, maxAmmo: 5, superCharge: 3000, attack: { kind: 'lob', count: 1, damage: 920, speed: 6.82, range: 7.5, blast: 1.55, flight: 0.72, fuse: 0.38, color: 0xff7a2a, cooldown: 0.3 }, skills: [{ id: 'sticky-grenade', name: 'Sticky Grenade', shortName: 'STICKY', cooldown: 9, range: 4.5, fuse: 2, damage: 700, blast: 1.5, knockback: 2.5, speed: 10, attachToTarget: true, attachToCover: true, color: 0xff8d3d }, { id: 'smoke-screen', name: 'Smoke Screen', shortName: 'SMOKE', cooldown: 13, radius: 2.8, duration: 3.5, slow: 0.2, color: 0x828a84 }], super: { kind: 'lob', count: 1, damage: 2400, speed: 5.16, range: 8.5, blast: 2.8, flight: 0.95, fuse: 0.7, color: 0xffd23a, cooldown: 0.2, knockback: 10, breaksWalls: true, big: true } }),
  titan: Object.freeze({ id: 'titan', name: 'Einar', speed: 3.25, reload: 1, maxHp: 6200, superCharge: 3200, attack: { kind: 'melee', count: 4, interval: 0.09, damage: 390, range: 2.7, arc: 1.5, radius: 0.48, color: 0xff5a4a, cooldown: 0.48 }, skills: [{ id: 'iron-charge', name: 'Iron Charge', shortName: 'CHARGE', cooldown: 9, distance: 4, duration: 0.38, damage: 300, knockback: 2.2, interrupt: true, color: 0xb9bd87 }, { id: 'taunt-echo', name: 'Taunt Echo', shortName: 'TAUNT', cooldown: 12, radius: 3.5, duration: 1.75, damageReduction: 0.3, slowAway: 0.3, color: 0xc1c89a }], super: { kind: 'leap', damage: 1000, range: 8, radius: 2.3, blast: 2.3, flight: 0.75, color: 0xffd23a, knockback: 11, breaksWalls: true, cooldown: 0.2 } }),
  volt: Object.freeze({ id: 'volt', name: 'Nopal', speed: 3.55, reload: 1.25, maxHp: 3400, superCharge: 3200, attack: { kind: 'burst', count: 3, interval: 0.075, electric: true, damage: 380, speed: 20, range: 8.4, spread: 0.025, jitter: 0.025, radius: 0.15, color: 0xffd43b, cooldown: 0.345 }, skills: [{ id: 'chain-lightning', name: 'Chain Lightning', shortName: 'CHAIN', cooldown: 7, range: 6.5, damage: 350, jumpCount: 2, jumpRange: 2.5, jumpDamage: 250, interruptDuration: 0.17, color: 0xffdf55 }, { id: 'overcharge-volt', name: 'Overcharge Volt', shortName: 'OVERCHARGE', cooldown: 12, duration: 3, speedMultiplier: 1.15, projectileCount: 4, color: 0xffef9a }], super: { kind: 'burst', count: 8, interval: 0.055, electric: true, damage: 310, speed: 23, range: 10.2, spread: 0.035, jitter: 0.035, radius: 0.19, color: 0xffed98, pierce: true, breaksWalls: true, cooldown: 0.2 } }),
  naka: Object.freeze({ id: 'naka', name: 'Naka', speed: 3.9, reload: 1.05, maxHp: 3200, superCharge: 3500, terrainAffinity: { type: 'bush', moveMultiplier: 1.08 }, attack: { kind: 'spread', count: 3, pellets: 3, damage: 280, speed: 24, range: 7, spread: 0.24, radius: 0.16, projectile: 'shuriken', color: 0x50f1d2, cooldown: 0.22, returning: true, returnDamageMultiplier: 0.5 }, skills: [{ id: 'smoke-bomb', name: 'Smoke Bomb', shortName: 'SMOKE', cooldown: 14, duration: 2, color: 0x59645f }, { id: 'kunai-dash', name: 'Kunai Dash', shortName: 'KUNAI', cooldown: 10, range: 6, damage: 280, speed: 24, recastWindow: 2, dashOffset: 0.85, color: 0xd9e1dc }], super: { kind: 'dash', damage: 900, range: 6, radius: 0.72, flight: 0.22, color: 0x9affdf, cooldown: 0.2 } }),
  ello: Object.freeze({ id: 'ello', name: 'Ello', speed: 3.3, reload: 1, maxHp: 5500, superCharge: 3500, terrainAffinity: { type: 'ice', tractionMultiplier: 1.2 }, knockbackResistance: 0.65, attack: { kind: 'melee', count: 1, damage: 550, range: 2.9, arc: 1.35, radius: 0.52, knockback: 1.4, color: 0xffcf6a, cooldown: 0.34, combo: [{ damage: 550, recovery: 0.34, lunge: 0.35 }, { damage: 650, recovery: 0.34, lunge: 0.4 }, { damage: 800, recovery: 0.46, lunge: 0.5 }], comboReset: 0.75, lungeDuration: 0.13 }, skills: [{ id: 'parry-stance', name: 'Parry Stance', shortName: 'PARRY', cooldown: 8, duration: 0.55, frontAngle: 120, empowerDuration: 2, color: 0xffdc75 }, { id: 'swift-flash', name: 'Swift Flash', shortName: 'FLASH', cooldown: 10, distance: 3.5, duration: 0.22, damage: 300, ccImmune: true, color: 0xffdc75 }], super: { kind: 'iaido', damage: 1100, baseDamage: 1100, parryDamage: 1500, range: 5.5, dashRange: 5.5, dashDuration: 0.2, radius: 0.8, slashRadius: 0.8, arc: 2.4, guardDuration: 0.45, color: 0xffdc75, cooldown: 0.2 } }),
  syafiah: Object.freeze({ id: 'syafiah', name: 'Syafiah', speed: 3.2, reload: 1.35, maxHp: 2900, superCharge: 3600, terrainAffinity: { type: 'low-gravity', rangeMultiplier: 1.1 }, attack: { kind: 'burst', count: 1, damage: 650, maxDamage: 1050, speed: 25, maxSpeed: 30, range: 10, maxRange: 12.5, chargeTime: 0.7, shotRecovery: 0.45, quickDamage: 650, quickRange: 10, quickSpeed: 25, radius: 0.12, projectile: 'arrow', color: 0xffc56c, cooldown: 0.45 }, skills: [{ id: 'eagle-eye', name: 'Eagle Eye', shortName: 'EAGLE', cooldown: 14, duration: 5, zoomMultiplier: 1.2, pierceDestructibleCover: 1, color: 0xffd78a }, { id: 'caltrops-trap', name: 'Caltrops Trap', shortName: 'CALTROPS', cooldown: 11, retreatDistance: 2.2, trapDuration: 3, radius: 0.7, slow: 0.35, damagePerSecond: 80, damageDuration: 2, color: 0xd2bd83 }], super: { kind: 'arrow-shower', damage: 250, waveDamage: 250, range: 10.5, radius: 3.4, areaRadius: 3.4, waveCount: 5, waveInterval: 0.35, warningDelay: 0.45, projectileCount: 8, color: 0xfff0aa, cooldown: 0.2 } }),
  gojo: Object.freeze({
    id: 'gojo', name: 'Gojo', role: 'Space Controller', speed: 3.25, reload: 1, maxHp: 3000, superCharge: 3800,
    attack: { kind: 'melee', name: 'Limitless Strike', count: 1, interval: 0.12, damage: 350, range: 2.8, arc: 1.5, radius: 0.45, cooldown: 0.34, combo: [{ damage: 350, pull: 0.3, recovery: 0.34 }, { damage: 350, pull: 0.3, recovery: 0.34 }, { damage: 600, push: 5, recovery: 0.46 }], comboReset: 0.75, color: 0x4777ff },
    skills: [
      { id: 'pull', name: 'Cursed Technique Lapse - Blue', shortName: 'BLUE', cooldown: 10, range: 7.5, radius: 2.4, damage: 300, slow: 0.3, duration: 2.4, pullSpeed: 3, color: 0x416cff },
      { id: 'repulse', name: 'Cursed Technique Reversal - Red', shortName: 'RED', cooldown: 11, range: 5, damage: 700, width: 0.55, knockback: 5.5, wallStun: 0.7, color: 0xff456d },
    ],
    super: { kind: 'gojo-domain', name: 'Domain Expansion - Infinite Void', range: 7.5, radius: 3.8, warningDelay: 0.5, duration: 4, freeze: 1.5, color: 0x617cff, cooldown: 0.2 },
  }),
  sukuna: Object.freeze({
    id: 'sukuna', name: 'Sukuna', role: 'Aggressive Fire Mage', speed: 3.25, reload: 1.1, maxHp: 4200, maxAmmo: 3, superCharge: 4000,
    attack: { kind: 'melee', name: 'Cleave', count: 1, interval: 0.12, damage: 450, range: 3, arc: 1.5, radius: 0.45, cooldown: 0.24, color: 0xf34255, sukunaBasic: true },
    skills: [
      { id: 'long-slash', name: 'Dismantle', shortName: 'DISMANTLE', cooldown: 7, range: 10, damage: 600, maxTargets: 3, width: 0.55, color: 0xe52d45 },
      { id: 'flame', name: 'Fuga - Kamino / Flame Arrow', shortName: 'FUGA', cooldown: 12, chargeTime: 1, range: 13.5, tapDamage: 500, tapRange: 9, chargedDamage: 1100, chargedRange: 13.5, blast: 1.8, burnDamage: 90, burnDuration: 3, projectileSpeed: 18, color: 0xff642e },
    ],
    super: { kind: 'sukuna-zone', name: 'Domain Expansion - Malevolent Shrine', range: 10.5, radius: 4.5, warningDelay: 0.45, duration: 4, waveCount: 8, waveInterval: 0.5, waveDamage: 180, breaksWalls: true, color: 0xe52d45, cooldown: 0.2 },
  }),
});

export function getCharacterDef(characterId) {
  return CHARACTER_DEFS[characterId] || CHARACTER_DEFS.dusty;
}

export const CHARACTER_IDS = Object.freeze(Object.keys(CHARACTER_DEFS));

export function characterUsesAmmo(characterId) {
  return characterId !== 'ello' && characterId !== 'syafiah' && characterId !== 'gojo';
}

export function characterMaxAmmo(characterId) {
  return getCharacterDef(characterId).maxAmmo || 3;
}

export const FLICKER = Object.freeze({
  cooldown: 30,
  distance: 2.2,
  duration: 0.18,
  invulnerability: 0.22,
});
