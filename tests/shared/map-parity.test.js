import { describe, expect, it } from 'vitest';
import { buildMapSpawnPoints, createMapCollision, getMapBlueprint } from '../../shared/maps/MapDefinitions.js';

describe('shared map blueprint', () => {
  it('uses the same generated obstacle cells and spawn positions as the rendered arena', () => {
    const mapId = 'green-crossroads';
    const seed = 123456;
    const blueprint = getMapBlueprint(mapId, seed);
    const collision = createMapCollision(mapId, seed);
    const half = blueprint.size / 2;

    for (let index = 0; index < blueprint.cells.length; index += 1) {
      const cell = blueprint.cells[index];
      if (cell.kind !== 'wall' && cell.kind !== 'water') continue;
      const x = index % blueprint.size + 0.5 - half;
      const z = Math.floor(index / blueprint.size) + 0.5 - half;
      expect(collision.isSolidPoint(x, z, 0.05)).toBe(true);
    }

    for (const spawn of buildMapSpawnPoints(mapId, seed, 8)) {
      expect(collision.isSolidPoint(spawn.x, spawn.z, 0.05)).toBe(false);
    }
  });
});
