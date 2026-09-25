import { clamp } from '../utils/math.js';

export class MapCollision {
  constructor({ minX = -20, maxX = 20, minZ = -20, maxZ = 20, blockers = [], layout = null } = {}) {
    this.bounds = { minX, maxX, minZ, maxZ };
    this.blockers = blockers.map((blocker) => ({ ...blocker }));
    this.layout = layout;
  }

  worldToTile(x, z) {
    if (!this.layout) return null;
    const { size, origin } = this.layout;
    const tileX = Math.floor(x - origin.x);
    const tileZ = Math.floor(z - origin.z);
    if (tileX < 0 || tileZ < 0 || tileX >= size || tileZ >= size) return null;
    return { x: tileX, z: tileZ, index: tileZ * size + tileX };
  }

  cellAt(x, z) {
    const tile = this.worldToTile(x, z);
    return tile ? this.layout.cellsData[tile.index]?.kind ?? null : null;
  }

  metaAt(x, z) {
    const tile = this.worldToTile(x, z);
    return tile ? this.layout.cellsData[tile.index]?.meta ?? null : null;
  }

  destroyCoverAt(tileX, tileZ) {
    if (!this.layout || !Number.isInteger(tileX) || !Number.isInteger(tileZ)) return false;
    const index = tileZ * this.layout.size + tileX;
    const cell = this.layout.cellsData[index];
    if (!cell || cell.kind !== this.layout.cells.WALL || cell.style === 'rock' || cell.style === 'lamp' || cell.meta?.indestructible) return false;
    this.layout.cellsData[index] = { ...cell, kind: this.layout.cells.EMPTY, meta: { ...cell.meta, destroyed: true } };
    this.rebuildBlockers();
    return true;
  }

  getBrokenCoverTiles() {
    if (!this.layout) return [];
    const broken = [];
    for (let index = 0; index < this.layout.cellsData.length; index += 1) {
      if (this.layout.cellsData[index]?.meta?.destroyed) broken.push({ tileX: index % this.layout.size, tileZ: Math.floor(index / this.layout.size) });
    }
    return broken;
  }

  rebuildBlockers() {
    const solid = new Set([this.layout.cells.WALL, this.layout.cells.WATER]);
    this.blockers = [];
    let previousRuns = new Map();
    for (let tileZ = 0; tileZ < this.layout.size; tileZ += 1) {
      const nextRuns = new Map();
      let tileX = 0;
      while (tileX < this.layout.size) {
        if (!solid.has(this.layout.cellsData[tileZ * this.layout.size + tileX]?.kind)) { tileX += 1; continue; }
        const start = tileX;
        while (tileX < this.layout.size && solid.has(this.layout.cellsData[tileZ * this.layout.size + tileX]?.kind)) tileX += 1;
        const key = `${start}:${tileX}`;
        const existing = previousRuns.get(key);
        if (existing) {
          existing.maxZ = tileZ + 1 + this.layout.origin.z;
          nextRuns.set(key, existing);
        } else {
          const blocker = {
            minX: start + this.layout.origin.x,
            maxX: tileX + this.layout.origin.x,
            minZ: tileZ + this.layout.origin.z,
            maxZ: tileZ + 1 + this.layout.origin.z,
          };
          this.blockers.push(blocker);
          nextRuns.set(key, blocker);
        }
      }
      previousRuns = nextRuns;
    }
  }

  surfaceAt(x, z) {
    const cell = this.cellAt(x, z);
    if (!this.layout || cell == null) return 'normal';
    const { cells } = this.layout;
    if (cell === cells.ICE) return 'ice';
    if (cell === cells.MUD) return 'mud';
    if (cell === cells.BUSH) return 'bush';
    if (cell === cells.HAZARD) return this.metaAt(x, z)?.hazardType === 'low-gravity' ? 'low-gravity' : 'hazard';
    if (cell === cells.WATER) return 'water';
    return 'normal';
  }

  hazardAt(x, z) {
    if (this.surfaceAt(x, z) !== 'hazard') return null;
    return this.metaAt(x, z)?.hazardType ?? 'lava';
  }

  isSolidPoint(x, z, radius = 0) {
    const resolved = this.resolveCircle(x, z, radius);
    return Math.abs(resolved.x - x) > 0.0001 || Math.abs(resolved.z - z) > 0.0001;
  }

  blocksSegment(ax, az, bx, bz, radius = 0) {
    const distance = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(distance / 0.22));
    for (let index = 1; index <= steps; index += 1) {
      const progress = index / steps;
      const x = ax + (bx - ax) * progress;
      const z = az + (bz - az) * progress;
      if (this.isSolidPoint(x, z, radius)) return true;
    }
    return false;
  }

  projectileBlocker(ax, az, bx, bz, radius = 0, ignoredCover = null) {
    if (!this.layout) return this.blocksSegment(ax, az, bx, bz, radius) ? { kind: 'solid' } : null;
    const distance = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(distance / 0.12));
    const { size, origin, cellsData, cells } = this.layout;
    const neighborReach = Math.max(1, Math.ceil(radius));
    for (let index = 1; index <= steps; index += 1) {
      const progress = index / steps;
      const x = ax + (bx - ax) * progress;
      const z = az + (bz - az) * progress;
      if (x < this.bounds.minX + radius || x > this.bounds.maxX - radius || z < this.bounds.minZ + radius || z > this.bounds.maxZ - radius) return { kind: 'solid' };
      const centerX = Math.floor(x - origin.x);
      const centerZ = Math.floor(z - origin.z);
      const nearby = [];
      for (let tileZ = centerZ - neighborReach; tileZ <= centerZ + neighborReach; tileZ += 1) {
        for (let tileX = centerX - neighborReach; tileX <= centerX + neighborReach; tileX += 1) {
          if (tileX < 0 || tileZ < 0 || tileX >= size || tileZ >= size) continue;
          const cell = cellsData[tileZ * size + tileX];
          if (cell?.kind !== cells.WALL && cell?.kind !== cells.WATER) continue;
          const closestX = clamp(x, origin.x + tileX, origin.x + tileX + 1);
          const closestZ = clamp(z, origin.z + tileZ, origin.z + tileZ + 1);
          if (Math.hypot(x - closestX, z - closestZ) > radius) continue;
          const sameIgnoredTile = ignoredCover?.x === tileX && ignoredCover?.z === tileZ;
          if (sameIgnoredTile) continue;
          const isCover = cell.kind === cells.WALL && cell.style !== 'rock' && cell.style !== 'lamp' && !cell.meta?.indestructible;
          nearby.push({ kind: isCover ? 'cover' : 'solid', tileX, tileZ });
        }
      }
      if (nearby.length) return nearby[0];
    }
    return null;
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
