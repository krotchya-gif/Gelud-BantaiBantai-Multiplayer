import { FLICKER } from '../../shared/data/characters.js';
import { normalize2 } from '../../shared/utils/math.js';

export function predictMovement(player, input, dt, speed, collision, mapId = 'open') {
  const next = { ...player };
  next.hardCCT = Math.max(0, (player.hardCCT || 0) - dt);
  next.hardCCRecoveryT = Math.max(0, (player.hardCCRecoveryT || 0) - dt);
  next.flickerInvulnT = Math.max(0, (player.flickerInvulnT || 0) - dt);

  if (player.airborneT > 0 || next.hardCCT > 0) {
    next.velX = 0;
    next.velZ = 0;
    next.airborneT = Math.max(0, (player.airborneT || 0) - dt);
    decrementMovementTimers(next, dt);
    decrementCharacterTimers(next, dt);
    return next;
  }

  if (player.flickerState) {
    const flicker = { ...player.flickerState, t: (player.flickerState.t || 0) + dt };
    const progress = Math.min(1, flicker.t / FLICKER.duration);
    const eased = progress * progress * (3 - 2 * progress);
    const resolved = collision.resolveCircle(
      flicker.fromX + (flicker.toX - flicker.fromX) * eased,
      flicker.fromZ + (flicker.toZ - flicker.fromZ) * eased,
      0.45,
    );
    next.x = resolved.x;
    next.z = resolved.z;
    next.velX = progress < 1 ? flicker.dx * (flicker.toX - flicker.fromX) / FLICKER.duration : 0;
    next.velZ = progress < 1 ? flicker.dz * (flicker.toZ - flicker.fromZ) / FLICKER.duration : 0;
    next.flickerState = progress >= 1 ? null : flicker;
    decrementMovementTimers(next, dt);
    decrementCharacterTimers(next, dt);
    return next;
  }

  if (player.skillDashState) {
    const dash = { ...player.skillDashState };
    dash.elapsed = Math.min(dash.duration, (dash.elapsed || 0) + dt);
    const progress = dash.duration > 0 ? dash.elapsed / dash.duration : 1;
    const eased = progress * progress * (3 - 2 * progress);
    const resolved = collision.resolveCircle(
      dash.fromX + (dash.toX - dash.fromX) * eased,
      dash.fromZ + (dash.toZ - dash.fromZ) * eased,
      0.45,
    );
    next.x = resolved.x;
    next.z = resolved.z;
    next.velX = dash.dirX * dash.distance / Math.max(0.01, dash.duration);
    next.velZ = dash.dirZ * dash.distance / Math.max(0.01, dash.duration);
    dash.finished = progress >= 1;
    next.skillDashState = dash.finished ? null : dash;
    if (dash.finished && dash.restoreAmmo > 0 && Number.isFinite(next.ammo)) {
      next.ammo = Math.min(next.maxAmmo ?? Infinity, next.ammo + dash.restoreAmmo);
    }
    decrementMovementTimers(next, dt);
    decrementCharacterTimers(next, dt);
    return next;
  }

  const direction = normalize2(input.moveX, input.moveZ);
  const surface = collision.surfaceAt?.(player.x, player.z) ?? 'normal';
  const gameplay = collision.layout?.gameplay ?? {};
  const affinity = player.characterId === 'naka'
    ? { type: 'bush', moveMultiplier: 1.08 }
    : player.characterId === 'ello'
      ? { type: 'ice', tractionMultiplier: 1.2 }
      : null;
  let effectiveSpeed = speed * (gameplay.moveMultiplier ?? 1);
  if (affinity?.type === 'bush' && surface === 'bush') effectiveSpeed *= affinity.moveMultiplier;
  if (surface === 'mud') effectiveSpeed *= gameplay.mudMoveMultiplier ?? 1;
  const speedBonus = Math.min(1.4,
    (player.itemSpeedT > 0 ? 1.35 : 1) *
    (player.speedBoostT > 0 ? 1.15 : 1) *
    (player.sukunaRushT > 0 ? 1.1 : 1) *
    (player.overchargeT > 0 ? 1.15 : 1));
  effectiveSpeed *= speedBonus;
  const effects = Array.isArray(player.slowEffects)
    ? player.slowEffects
    : player.slowEffects instanceof Map
      ? [...player.slowEffects.values()]
      : [];
  const statusSlow = Math.min(1, ...effects.map((effect) => effect.multiplier ?? 1));
  effectiveSpeed *= player.slowT > 0 ? Math.min(0.85, statusSlow) : statusSlow;
  if ((player.charging || player.chargeStartedAt != null || player.networkCharging) && player.characterId === 'syafiah') effectiveSpeed *= 0.88;
  if (player.burstT > 0 && player.characterId !== 'ello') effectiveSpeed *= 0.82;
  if (player.hardCCT > 0) effectiveSpeed = 0;
  let velX = direction.x * effectiveSpeed;
  let velZ = direction.z * effectiveSpeed;
  if (surface === 'ice') {
    const traction = (gameplay.iceFriction ?? gameplay.friction ?? 1) * (affinity?.type === 'ice' ? affinity.tractionMultiplier : 1);
    const blend = 1 - Math.exp(-18 * Math.max(0.05, traction) * dt);
    velX = (player.velX || 0) + (velX - (player.velX || 0)) * blend;
    velZ = (player.velZ || 0) + (velZ - (player.velZ || 0)) * blend;
  }
  next.x = player.x + velX * dt;
  next.z = player.z + velZ * dt;
  next.velX = velX;
  next.velZ = velZ;
  next.facing = Math.hypot(input.aimX || 0, input.aimZ || 0) > 1e-8
    ? Math.atan2(input.aimX, input.aimZ)
    : player.facing;
  const resolved = collision.resolveCircle(next.x, next.z, 0.45);
  next.x = resolved.x;
  next.z = resolved.z;
  decrementMovementTimers(next, dt);
  decrementCharacterTimers(next, dt);
  return next;
}

function decrementMovementTimers(player, dt) {
  for (const key of ['speedBoostT', 'itemSpeedT', 'burstT', 'shieldT', 'slowT', 'spawnProtectionT']) {
    if (player[key] > 0) player[key] = Math.max(0, player[key] - dt);
  }
}

function decrementCharacterTimers(player, dt) {
  for (const key of ['sukunaRushT', 'overchargeT', 'damageReductionT', 'ccImmuneT', 'defenseBreakT', 'stealthT', 'smokeRevealT', 'eagleEyeT', 'skillParryT', 'parryEmpowerT', 'tauntEchoT']) {
    if (player[key] > 0) player[key] = Math.max(0, player[key] - dt);
  }
  if (Array.isArray(player.slowEffects)) {
    player.slowEffects = player.slowEffects
      .map((effect) => ({ ...effect, remaining: Math.max(0, effect.remaining - dt) }))
      .filter((effect) => effect.remaining > 0);
  } else if (player.slowEffects instanceof Map) {
    player.slowEffects = new Map([...player.slowEffects].map(([id, effect]) => [id, { ...effect, remaining: Math.max(0, effect.remaining - dt) }]));
    for (const [id, effect] of player.slowEffects) if (effect.remaining <= 0) player.slowEffects.delete(id);
  }
}

export class InputHistory {
  constructor(maxSize = 120) {
    this.maxSize = maxSize;
    this.inputs = [];
  }

  add(input) {
    this.inputs.push(input);
    if (this.inputs.length > this.maxSize) this.inputs.shift();
  }

  acknowledge(seq) {
    this.inputs = this.inputs.filter((input) => input.seq > seq);
  }

  pending() {
    return this.inputs.slice();
  }
}
