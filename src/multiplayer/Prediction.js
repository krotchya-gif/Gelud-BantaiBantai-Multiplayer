import { normalize2 } from '../../shared/utils/math.js';

export function predictMovement(player, input, dt, speed, collision, mapId = 'open') {
  const direction = normalize2(input.moveX, input.moveZ);
  const mapSurface = mapId.includes('frozen') || mapId.includes('ice')
    ? 'ice'
    : mapId.includes('bog') || mapId.includes('toxic') || mapId.includes('sunken-ruins')
      ? 'mud'
      : 'normal';
  const surfaceMultiplier = mapSurface === 'ice' && player.characterId === 'ello' ? 1.08 : mapSurface === 'mud' ? 0.82 : 1;
  const effectiveSpeed = speed
    * (player.speedBoostT > 0 ? 1.35 : 1)
    * (player.slowT > 0 ? 0.85 : 1)
    * surfaceMultiplier;
  const next = {
    ...player,
    x: player.x + direction.x * effectiveSpeed * dt,
    z: player.z + direction.z * effectiveSpeed * dt,
    velX: direction.x * effectiveSpeed,
    velZ: direction.z * effectiveSpeed,
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
