// Gameplay-only character data. Visual meshes and animation data stay in public/engine.
export const CHARACTER_DEFS = Object.freeze({
  dusty: Object.freeze({ id: 'dusty', speed: 3.15, maxHp: 3900, superCharge: 3000, attack: { kind: 'projectile', count: 5, damage: 330, speed: 22, range: 7, spread: 0.18, cooldown: 1 }, super: { kind: 'spread', count: 9, damage: 340, speed: 16, range: 8, spread: 0.85, radius: 0.2, knockback: 1.2 } }),
  ace: Object.freeze({ id: 'ace', speed: 3.25, maxHp: 3000, superCharge: 3600, attack: { kind: 'projectile', count: 6, damage: 300, speed: 25, range: 9.5, spread: 0.16, cooldown: 1 }, super: { kind: 'burst', count: 12, damage: 340, speed: 21, range: 11.5, radius: 0.2, pierce: true } }),
  fuse: Object.freeze({ id: 'fuse', speed: 3, maxHp: 2900, superCharge: 3000, attack: { kind: 'projectile', count: 1, damage: 920, speed: 12, range: 7.5, radius: 1.55, cooldown: 1.2 }, super: { kind: 'explosion', damage: 2400, range: 8.5, radius: 2.8, cooldown: 1.2, knockback: 2 } }),
  titan: Object.freeze({ id: 'titan', speed: 3.25, maxHp: 6200, superCharge: 3200, attack: { kind: 'melee', count: 1, damage: 390, range: 2.7, arc: 1.5, cooldown: 0.65 }, super: { kind: 'leap', damage: 1000, range: 8, radius: 2.3, knockback: 2.2, cooldown: 1 } }),
  volt: Object.freeze({ id: 'volt', speed: 3.55, maxHp: 3400, superCharge: 3200, attack: { kind: 'projectile', count: 3, damage: 440, speed: 22, range: 8.4, spread: 0.14, cooldown: 1 }, super: { kind: 'burst', count: 8, damage: 310, speed: 23, range: 10.2, radius: 0.19, pierce: true } }),
  naka: Object.freeze({ id: 'naka', speed: 3.9, maxHp: 3200, superCharge: 3500, attack: { kind: 'projectile', count: 3, damage: 300, speed: 24, range: 7, spread: 0.24, cooldown: 1.05, returning: true }, super: { kind: 'dash', damage: 900, range: 6, radius: 0.72, cooldown: 0.4 } }),
  ello: Object.freeze({ id: 'ello', speed: 3.3, maxHp: 5500, superCharge: 3500, attack: { kind: 'melee', count: 1, damage: 550, range: 2.9, arc: 1.35, cooldown: 0.34, combo: [550, 650, 800] }, super: { kind: 'iaido', damage: 1100, parryDamage: 1500, range: 5.5, radius: 0.8, guardDuration: 0.45, cooldown: 0.2 } }),
  syafiah: Object.freeze({ id: 'syafiah', speed: 3.2, maxHp: 2900, superCharge: 3600, attack: { kind: 'projectile', count: 1, damage: 650, maxDamage: 1050, speed: 25, maxSpeed: 30, range: 10, maxRange: 12.5, chargeTime: 0.7, cooldown: 0.45 }, super: { kind: 'arrow-shower', damage: 250, range: 10.5, radius: 3.4, waveCount: 5, waveInterval: 0.35, warningDelay: 0.45 } }),
});

export function getCharacterDef(characterId) {
  return CHARACTER_DEFS[characterId] || CHARACTER_DEFS.dusty;
}
