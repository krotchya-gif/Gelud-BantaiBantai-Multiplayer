import { describe, expect, it } from 'vitest';
import { buildMapSpawnPoints, createMapCollision, getMapBlueprint, MAP_DEFINITIONS } from '../../shared/maps/MapDefinitions.js';

describe('shared map blueprint', () => {
  const generatedMaps = Object.keys(MAP_DEFINITIONS).filter((mapId) => mapId !== 'open');

  it.each(generatedMaps.flatMap((mapId) => [1, 20260926, -314159].map((seed) => [mapId, seed])))
    ('keeps rendered cover, solid collision, and spawn points in sync for %s at seed %s', (mapId, seed) => {
      const blueprint = getMapBlueprint(mapId, seed);
      const repeat = getMapBlueprint(mapId, seed);
      const collision = createMapCollision(mapId, seed);
      const half = blueprint.size / 2;

      expect(blueprint.id).toBe(mapId);
      expect(repeat.cells).toEqual(blueprint.cells);
      let solidCells = 0;
      for (let index = 0; index < blueprint.cells.length; index += 1) {
        const cell = blueprint.cells[index];
        if (cell.kind !== 'wall' && cell.kind !== 'water') continue;
        solidCells += 1;
        const x = index % blueprint.size + 0.5 - half;
        const z = Math.floor(index / blueprint.size) + 0.5 - half;
        expect(collision.isSolidPoint(x, z, 0.05)).toBe(true);
      }
      expect(solidCells).toBeGreaterThan(0);

      for (const spawn of buildMapSpawnPoints(mapId, seed, 8)) {
        expect(collision.isSolidPoint(spawn.x, spawn.z, 0.05)).toBe(false);
      }
    });

  it('keeps River Fort selected and generates walkable bridge crossings over its river', () => {
    const seed = 20260926;
    const blueprint = getMapBlueprint('river-fort', seed);
    const collision = createMapCollision('river-fort', seed);
    const water = blueprint.cells.filter((cell) => cell.kind === 'water');
    const bridges = blueprint.cells
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.kind === 'bridge');

    expect(blueprint.id).toBe('river-fort');
    expect(water.length).toBeGreaterThan(0);
    expect(bridges.length).toBeGreaterThan(0);
    for (const { index } of bridges) {
      const x = index % blueprint.size + 0.5 - blueprint.size / 2;
      const z = Math.floor(index / blueprint.size) + 0.5 - blueprint.size / 2;
      expect(collision.isSolidPoint(x, z, 0.05)).toBe(false);
    }
  });
});
