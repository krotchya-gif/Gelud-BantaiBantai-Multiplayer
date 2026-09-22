import { normalize2 } from '../../shared/utils/math.js';

export function predictMovement(player, input, dt, speed, collision) {
  const direction = normalize2(input.moveX, input.moveZ);
  const next = {
    ...player,
    x: player.x + direction.x * speed * dt,
    z: player.z + direction.z * speed * dt,
    velX: direction.x * speed,
    velZ: direction.z * speed,
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
