import { clamp } from '../utils/math.js';

export class MapCollision {
  constructor({ minX = -20, maxX = 20, minZ = -20, maxZ = 20, blockers = [] } = {}) {
    this.bounds = { minX, maxX, minZ, maxZ };
    this.blockers = blockers.map((blocker) => ({ ...blocker }));
  }

  resolveCircle(x, z, radius = 0.45) {
    let nextX = clamp(x, this.bounds.minX + radius, this.bounds.maxX - radius);
    let nextZ = clamp(z, this.bounds.minZ + radius, this.bounds.maxZ - radius);
    for (const blocker of this.blockers) {
      const closestX = clamp(nextX, blocker.minX, blocker.maxX);
      const closestZ = clamp(nextZ, blocker.minZ, blocker.maxZ);
      const dx = nextX - closestX;
      const dz = nextZ - closestZ;
      const distance = Math.hypot(dx, dz);
      if (distance >= radius) continue;
      if (distance > 1e-8) {
        const push = radius - distance;
        nextX += (dx / distance) * push;
        nextZ += (dz / distance) * push;
      } else {
        const left = Math.abs(nextX - blocker.minX);
        const right = Math.abs(blocker.maxX - nextX);
        const top = Math.abs(nextZ - blocker.minZ);
        const bottom = Math.abs(blocker.maxZ - nextZ);
        const smallest = Math.min(left, right, top, bottom);
        if (smallest === left) nextX = blocker.minX - radius;
        else if (smallest === right) nextX = blocker.maxX + radius;
        else if (smallest === top) nextZ = blocker.minZ - radius;
        else nextZ = blocker.maxZ + radius;
      }
    }
    return { x: nextX, z: nextZ };
  }
}
