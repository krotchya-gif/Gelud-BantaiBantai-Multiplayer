export const EPSILON = 1e-8;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function length2(x, z) {
  return Math.hypot(x, z);
}

export function normalize2(x, z) {
  const length = Math.hypot(x, z);
  return length > EPSILON ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

export function distanceSquared2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

export function moveTowards(current, target, maxDelta) {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}
