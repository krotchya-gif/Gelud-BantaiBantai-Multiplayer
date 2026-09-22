import { normalize2 } from '../../shared/utils/math.js';

export function predictMovement(player, input, dt, speed, collision, mapId = 'open') {
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
  if (player.speedBoostT > 0) effectiveSpeed *= 1.35;
  if (player.slowT > 0) effectiveSpeed *= 0.85;
  let velX = direction.x * effectiveSpeed;
  let velZ = direction.z * effectiveSpeed;
  if (surface === 'ice') {
    const traction = (gameplay.iceFriction ?? gameplay.friction ?? 1) * (affinity?.type === 'ice' ? affinity.tractionMultiplier : 1);
    const blend = 1 - Math.exp(-18 * Math.max(0.05, traction) * dt);
    velX = (player.velX || 0) + (velX - (player.velX || 0)) * blend;
    velZ = (player.velZ || 0) + (velZ - (player.velZ || 0)) * blend;
  }
  const next = {
    ...player,
    x: player.x + velX * dt,
    z: player.z + velZ * dt,
    velX,
    velZ,
    facing: Math.hypot(input.aimX || 0, input.aimZ || 0) > 1e-8
      ? Math.atan2(input.aimX, input.aimZ)
      : player.facing,
  };
  const resolved = collision.resolveCircle(next.x, next.z, 0.45);
  next.x = resolved.x;
  next.z = resolved.z;
  return next;
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
