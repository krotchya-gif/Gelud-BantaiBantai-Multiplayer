import { MapCollision } from './MapCollision.js';
import { SeededRng } from '../utils/rng.js';

// The browser loads this classic map pack before a player can open a room.
// The server and test runner load the exact same generator here so its
// authoritative collision grid never drifts from the rendered arena.
if (typeof window === 'undefined') await import('../../public/engine/map-biomes.js');

// Keep the public map ids in one shared place. The renderer has richer
// procedural geometry, while the server needs the same bounds, blockers,
// spawn points, and surface rules for authoritative movement.
const MAPS = Object.freeze({
  open: { label: 'Open Arena', biome: 'grassland', recipe: 'open', surface: 'normal', hazard: null },
  'green-crossroads': { label: 'Green Crossroads', biome: 'grassland', recipe: 'crossroads', surface: 'normal', hazard: null },
  'river-fort': { label: 'River Fort', biome: 'grassland', recipe: 'river', surface: 'normal', hazard: 'water' },
  'hedge-ring': { label: 'Hedge Ring', biome: 'grassland', recipe: 'ring', surface: 'bush', hazard: null },
  'dune-cross': { label: 'Dune Cross', biome: 'desert', recipe: 'crossroads', surface: 'normal', hazard: null },
  'dry-canyon': { label: 'Dry Canyon', biome: 'desert', recipe: 'lanes', surface: 'normal', hazard: null },
  'sunken-temple': { label: 'Sunken Temple', biome: 'desert', recipe: 'courtyard', surface: 'normal', hazard: null },
  'frozen-lake': { label: 'Frozen Lake', biome: 'snow', recipe: 'lake', surface: 'ice', hazard: null },
  'ice-ridge': { label: 'Ice Ridge', biome: 'snow', recipe: 'lanes', surface: 'ice', hazard: null },
  'snow-fort': { label: 'Snow Fort', biome: 'snow', recipe: 'courtyard', surface: 'ice', hazard: null },
  'river-temple': { label: 'River Temple', biome: 'jungle', recipe: 'river', surface: 'bush', hazard: 'water' },
  'canopy-maze': { label: 'Canopy Maze', biome: 'jungle', recipe: 'maze', surface: 'bush', hazard: null },
  'waterfall-basin': { label: 'Waterfall Basin', biome: 'jungle', recipe: 'basin', surface: 'bush', hazard: 'water' },
  'crater-ring': { label: 'Crater Ring', biome: 'lava', recipe: 'ring', surface: 'normal', hazard: 'lava' },
  'molten-cross': { label: 'Molten Cross', biome: 'lava', recipe: 'lava-cross', surface: 'normal', hazard: 'lava' },
  'blackstone-bridges': { label: 'Blackstone Bridges', biome: 'lava', recipe: 'river', surface: 'normal', hazard: 'lava' },
  'bog-islands': { label: 'Bog Islands', biome: 'swamp', recipe: 'islands', surface: 'mud', hazard: 'toxic' },
  'toxic-canals': { label: 'Toxic Canals', biome: 'swamp', recipe: 'river', surface: 'mud', hazard: 'toxic' },
  'sunken-ruins': { label: 'Sunken Ruins', biome: 'swamp', recipe: 'courtyard', surface: 'mud', hazard: 'toxic' },
  'cliff-pass': { label: 'Cliff Pass', biome: 'mountain', recipe: 'lanes', surface: 'normal', hazard: null },
  'temple-steps': { label: 'Temple Steps', biome: 'mountain', recipe: 'courtyard', surface: 'normal', hazard: null },
  'twin-peaks': { label: 'Twin Peaks', biome: 'mountain', recipe: 'split-center', surface: 'normal', hazard: null },
  'crater-grid': { label: 'Crater Grid', biome: 'moon', recipe: 'basin', surface: 'normal', hazard: null },
  'lunar-base': { label: 'Lunar Base', biome: 'moon', recipe: 'courtyard', surface: 'normal', hazard: null },
  'gravity-rifts': { label: 'Gravity Rifts', biome: 'moon', recipe: 'split-center', surface: 'low-gravity', hazard: null },
});

export const MAP_DEFINITIONS = MAPS;

export function getMapDefinition(mapId = 'open') {
  return MAPS[mapId] || MAPS.open;
}

function getMapPack() {
  return globalThis.GBH_MAP_PACK ?? null;
}

function buildBlueprintLayout(mapId, seed) {
  const pack = getMapPack();
  if (!pack?.generate || !pack.MAPS?.[mapId]) return null;
  const blueprint = pack.generate(mapId, seed);
  if (!blueprint?.cells?.length) return null;

  const cells = pack.CELL;
  const size = blueprint.size;
  const solid = new Set([cells.WALL, cells.WATER]);
  const blockers = [];
  let previousRuns = new Map();

  for (let tileZ = 0; tileZ < size; tileZ += 1) {
    const nextRuns = new Map();
    let tileX = 0;
    while (tileX < size) {
      if (!solid.has(blueprint.cells[tileZ * size + tileX].kind)) {
        tileX += 1;
        continue;
      }
      const start = tileX;
      while (tileX < size && solid.has(blueprint.cells[tileZ * size + tileX].kind)) tileX += 1;
      const key = `${start}:${tileX}`;
      const existing = previousRuns.get(key);
      if (existing) {
        existing.maxZ = tileZ + 1 - size / 2;
        nextRuns.set(key, existing);
      } else {
        const blocker = {
          minX: start - size / 2,
          maxX: tileX - size / 2,
          minZ: tileZ - size / 2,
          maxZ: tileZ + 1 - size / 2,
        };
        blockers.push(blocker);
        nextRuns.set(key, blocker);
      }
    }
    previousRuns = nextRuns;
  }

  return {
    blueprint,
    blockers,
    layout: {
      size,
      origin: { x: -size / 2, z: -size / 2 },
      cells: { ...cells },
      cellsData: blueprint.cells,
      gameplay: blueprint.gameplay,
    },
  };
}

export function getMapBlueprint(mapId = 'open', seed = 0) {
  return buildBlueprintLayout(mapId, seed)?.blueprint ?? null;
}

export function buildMapSpawnPoints(mapId = 'open', seed = 0, count = 8) {
  const blueprint = getMapBlueprint(mapId, seed);
  if (!blueprint?.cells?.length) return buildSpawnPoints(count);
  const half = blueprint.size / 2;
  const cellTypes = getMapPack()?.CELL || {};
  const candidates = [];
  const seen = new Set();
  for (let tileZ = 3; tileZ < blueprint.size - 3; tileZ += 1) {
    for (let tileX = 3; tileX < blueprint.size - 3; tileX += 1) {
      const cell = blueprint.cells[tileZ * blueprint.size + tileX];
      if (!cell || cell.kind === cellTypes.WALL || cell.kind === cellTypes.WATER || cell.kind === cellTypes.HAZARD) continue;
      const key = `${tileX}:${tileZ}`;
      seen.add(key);
      candidates.push({ x: tileX + 0.5 - half, z: tileZ + 0.5 - half });
    }
  }
  if (!candidates.length) return buildSpawnPoints(count);
  const rng = new SeededRng((seed | 0) ^ mapId.length * 7919);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = rng.int(0, index);
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
  }
  const preferred = (blueprint.spawns || [])
    .map(([tileX, tileZ]) => ({ x: tileX + 0.5 - half, z: tileZ + 0.5 - half }))
    .filter((point) => seen.has(`${Math.floor(point.x + half)}:${Math.floor(point.z + half)}`));
  for (let index = preferred.length - 1; index > 0; index -= 1) {
    const swap = rng.int(0, index);
    [preferred[index], preferred[swap]] = [preferred[swap], preferred[index]];
  }
  const points = [];
  const first = preferred[0] || candidates[0];
  points.push(first);
  const remaining = candidates.filter((candidate) => candidate !== first);
  while (points.length < Math.max(1, count) && remaining.length) {
    let bestIndex = 0;
    let bestDistance = -Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const distance = Math.min(...points.map((point) => Math.hypot(candidate.x - point.x, candidate.z - point.z)));
      if (distance > bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    points.push(remaining.splice(bestIndex, 1)[0]);
  }
  while (points.length < Math.max(1, count)) points.push(points[0]);
  return points;
}

export function createMapCollision(mapId = 'open', seed = 0) {
  const map = getMapDefinition(mapId);
  const exactLayout = buildBlueprintLayout(mapId, seed);
  if (exactLayout) {
    const half = exactLayout.layout.size / 2;
    return new MapCollision({
      minX: -half,
      maxX: half,
      minZ: -half,
      maxZ: half,
      blockers: exactLayout.blockers,
      layout: exactLayout.layout,
    });
  }
  const blockers = [];
  const add = (minX, maxX, minZ, maxZ) => blockers.push({ minX, maxX, minZ, maxZ });
  const jitter = ((Math.abs(seed | 0) % 997) / 997 - 0.5) * 0.6;
  if (map.recipe === 'crossroads') {
    add(-1.2, 1.2, -8.5, -3.2); add(-1.2, 1.2, 3.2, 8.5);
    add(-8.5, -3.2, -1.2, 1.2); add(3.2, 8.5, -1.2, 1.2);
  } else if (map.recipe === 'river' || map.recipe === 'lava-cross') {
    add(-1.6, 1.6, -24, -3.1); add(-1.6, 1.6, 3.1, 24);
    add(-24, -3.1, -1.6, 1.6); add(3.1, 24, -1.6, 1.6);
  } else if (map.recipe === 'lanes') {
    add(-8.4, -6.8, -16, 16); add(6.8, 8.4, -16, 16);
  } else if (map.recipe === 'ring') {
    add(-10, -7.8, -7.8, 7.8); add(7.8, 10, -7.8, 7.8);
    add(-7.8, 7.8, -10, -7.8); add(-7.8, 7.8, 7.8, 10);
  } else if (map.recipe === 'courtyard' || map.recipe === 'basin') {
    add(-7.5, -5.8, -5.5, 5.5); add(5.8, 7.5, -5.5, 5.5);
    add(-4.2, 4.2, -7.5, -5.8); add(-4.2, 4.2, 5.8, 7.5);
  } else if (map.recipe === 'split-center') {
    add(-1.2, 1.2, -24, -4.2); add(-1.2, 1.2, 4.2, 24);
    add(-12, -4.2, -1.2, 1.2); add(4.2, 12, -1.2, 1.2);
  } else if (map.recipe === 'maze') {
    add(-12, -10.4, -13, 3); add(-4, -2.4, -3, 13); add(4, 5.6, -13, 3); add(10.4, 12, -3, 13);
  } else if (map.recipe === 'islands') {
    add(-11, -6, -3, 3); add(6, 11, -3, 3); add(-3, 3, -11, -6); add(-3, 3, 6, 11);
  } else if (map.recipe === 'lake') {
    add(-3.5, 3.5, -3.5, 3.5);
  }
  if (jitter && blockers.length) {
    for (const blocker of blockers) {
      blocker.minX += jitter; blocker.maxX += jitter;
      blocker.minZ -= jitter; blocker.maxZ -= jitter;
    }
  }
  return new MapCollision({ minX: -24, maxX: 24, minZ: -24, maxZ: 24, blockers });
}

export function buildSpawnPoints(count = 8) {
  const points = [];
  for (let i = 0; i < Math.max(1, count); i += 1) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    points.push({ x: Math.sin(angle) * 14, z: Math.cos(angle) * 14 });
  }
  return points;
}
