/**
 * GELUD BANTAI-BANTAI — WORLD / BIOME MAP PACK
 * ============================================================
 * Tujuan:
 * - Menambah banyak "world" ala filosofi Team Buddies tanpa menyalin map/asetnya.
 * - 8 biome, masing-masing 3 varian layout = 24 map.
 * - File ini TIDAK bergantung pada Three.js.
 * - Generator menghasilkan blueprint 44x44 yang bisa diadaptasi ke World/Zl di
 *   public/engine/world.js.
 *
 * CARA INTEGRASI UNTUK CODEX
 * ------------------------------------------------------------
 * 1. Load file ini SEBELUM public/engine/world.js:
 *      'engine/map-biomes.js'
 *
 * 2. Di world.js, perluas ARENA_VARIANTS dari GBH_MAP_PACK.arenaVariants.
 *
 * 3. Pada class Zl/World:
 *      const blueprint = GBH_MAP_PACK.generate(this.arenaName, seed);
 *    lalu copy blueprint ke:
 *      this.tiles
 *      this.styles
 *      this.spawns
 *      this.boxSpots
 *      this.lampTiles
 *    Gunakan GBH_MAP_PACK.applyLegacyWorld(...) untuk fallback awal.
 *
 * 4. Setelah map bisa dimainkan, implementasikan visual/hazard native berdasarkan:
 *      blueprint.biome
 *      blueprint.palette
 *      blueprint.hazards
 *      blueprint.landmarks
 *      blueprint.gameplay
 *
 * 5. JANGAN menjadikan biome cuma reskin:
 *      lava     => damage zone / choke bridges
 *      snow     => slippery ice
 *      jungle   => concealment / dense bush
 *      swamp    => mud slow + toxic water
 *      mountain => narrow pass / high-ground feel
 *      moon     => optional low-gravity zones
 *
 * 6. Existing engine saat ini memakai tile Z.EMPTY/WALL/BUSH/WATER dan style Fc.
 *    applyLegacyWorld() sengaja punya fallback agar Codex bisa membuat map tampil
 *    terlebih dahulu sebelum custom renderer/hazard selesai.
 */

(function initGeludMapPack(global) {
  'use strict';

  const SIZE = 44;
  const BORDER = 2;
  const CELL_COUNT = SIZE * SIZE;

  const CELL = Object.freeze({
    EMPTY: 'empty',
    WALL: 'wall',
    BUSH: 'bush',
    WATER: 'water',
    HAZARD: 'hazard',
    ICE: 'ice',
    MUD: 'mud',
    BRIDGE: 'bridge',
  });

  const STYLE = Object.freeze({
    ROCK: 'rock',
    STONE: 'stone',
    CRATE: 'crate',
    BARREL: 'barrel',
    CACTUS: 'cactus',
    TREE: 'tree',
    ICE_ROCK: 'ice-rock',
    OBSIDIAN: 'obsidian',
    RUIN: 'ruin',
    METAL: 'metal',
    LAMP: 'lamp',
    MUSHROOM: 'mushroom',
    CRYSTAL: 'crystal',
  });

  const DEFAULT_SPAWNS = Object.freeze([
    [6, 6],
    [37, 6],
    [6, 37],
    [37, 37],
    [21, 5],
    [38, 21],
    [22, 38],
    [5, 22],
  ]);

  const BIOMES = Object.freeze({
    grassland: {
      label: 'Greenlands',
      icon: '🌿',
      description: 'Padang rumput seimbang dengan semak, sungai, dan reruntuhan kecil.',
      palette: {
        groundA: '#86b85b',
        groundB: '#78a84f',
        accent: '#c8d98c',
        liquid: '#58a9cf',
        sky: '#9ed8ff',
        fog: '#b5d9cf',
      },
      gameplay: {
        moveMultiplier: 1,
        friction: 1,
        vision: 1,
      },
      generation: {
        cover: [8, 12],
        bushes: [4, 7],
        liquids: [0, 2],
        lamps: [2, 4],
        coverStyles: [STYLE.STONE, STYLE.CRATE, STYLE.BARREL, STYLE.TREE],
      },
    },

    desert: {
      label: 'Dust Valley',
      icon: '🏜️',
      description: 'Gurun terbuka, canyon sempit, cactus, dan reruntuhan batu.',
      palette: {
        groundA: '#d8a75e',
        groundB: '#c99049',
        accent: '#efd18a',
        liquid: '#4c98b6',
        sky: '#f4c57c',
        fog: '#d8b780',
      },
      gameplay: {
        moveMultiplier: 1,
        friction: 0.95,
        vision: 1.1,
      },
      generation: {
        cover: [7, 11],
        bushes: [0, 2],
        liquids: [0, 1],
        lamps: [1, 3],
        coverStyles: [STYLE.ROCK, STYLE.STONE, STYLE.CACTUS, STYLE.CRATE],
      },
    },

    snow: {
      label: 'Frozen Fields',
      icon: '❄️',
      description: 'Salju, danau beku, batu es, dan jalur yang licin.',
      palette: {
        groundA: '#d8edf1',
        groundB: '#c5dce3',
        accent: '#f4fbff',
        liquid: '#83c9df',
        sky: '#b8ddf5',
        fog: '#d9edf5',
      },
      gameplay: {
        moveMultiplier: 0.98,
        friction: 0.82,
        vision: 1,
        iceFriction: 0.25,
      },
      generation: {
        cover: [8, 12],
        bushes: [1, 4],
        liquids: [1, 2],
        lamps: [2, 4],
        coverStyles: [STYLE.ICE_ROCK, STYLE.STONE, STYLE.CRATE],
      },
    },

    jungle: {
      label: 'Wild Jungle',
      icon: '🌴',
      description: 'Hutan rapat, sungai, semak tinggi, dan jalur flank tersembunyi.',
      palette: {
        groundA: '#477a43',
        groundB: '#385f38',
        accent: '#8fb568',
        liquid: '#3e8d88',
        sky: '#86c9a6',
        fog: '#668d70',
      },
      gameplay: {
        moveMultiplier: 0.98,
        friction: 1,
        vision: 0.9,
        bushConcealment: 1.25,
      },
      generation: {
        cover: [11, 16],
        bushes: [8, 13],
        liquids: [1, 3],
        lamps: [1, 3],
        coverStyles: [STYLE.TREE, STYLE.ROCK, STYLE.STONE],
      },
    },

    lava: {
      label: 'Magma Basin',
      icon: '🌋',
      description: 'Arena vulkanik dengan sungai lava, jembatan, dan choke point berbahaya.',
      palette: {
        groundA: '#403633',
        groundB: '#2e2928',
        accent: '#8a5746',
        liquid: '#ff5b18',
        sky: '#8d4836',
        fog: '#5d3631',
      },
      gameplay: {
        moveMultiplier: 1,
        friction: 1,
        vision: 0.95,
        hazardDamagePerSecond: 900,
      },
      generation: {
        cover: [8, 13],
        bushes: [0, 1],
        liquids: [2, 4],
        lamps: [2, 5],
        coverStyles: [STYLE.OBSIDIAN, STYLE.ROCK, STYLE.STONE],
      },
    },

    swamp: {
      label: 'Toxic Swamp',
      icon: '🐸',
      description: 'Rawa berlumpur, pulau kecil, kabut, dan kolam beracun.',
      palette: {
        groundA: '#59684b',
        groundB: '#48553f',
        accent: '#91a467',
        liquid: '#759447',
        sky: '#87987c',
        fog: '#68745f',
      },
      gameplay: {
        moveMultiplier: 0.96,
        friction: 0.86,
        vision: 0.88,
        mudMoveMultiplier: 0.62,
        toxicDamagePerSecond: 260,
      },
      generation: {
        cover: [10, 15],
        bushes: [6, 10],
        liquids: [3, 5],
        lamps: [2, 4],
        coverStyles: [STYLE.TREE, STYLE.ROCK, STYLE.MUSHROOM, STYLE.BARREL],
      },
    },

    mountain: {
      label: 'Sky Peaks',
      icon: '🏔️',
      description: 'Pegunungan dan reruntuhan dengan pass sempit serta courtyard terbuka.',
      palette: {
        groundA: '#8f8b7b',
        groundB: '#777469',
        accent: '#c5bd9c',
        liquid: '#6fa4b1',
        sky: '#a9d0e5',
        fog: '#a0a49d',
      },
      gameplay: {
        moveMultiplier: 1,
        friction: 1,
        vision: 1.05,
      },
      generation: {
        cover: [13, 18],
        bushes: [1, 4],
        liquids: [0, 1],
        lamps: [3, 6],
        coverStyles: [STYLE.ROCK, STYLE.RUIN, STYLE.STONE],
      },
    },

    moon: {
      label: 'Lunar Outpost',
      icon: '🌙',
      description: 'Crater, pangkalan logam, kristal, dan zona gravitasi rendah.',
      palette: {
        groundA: '#777c8e',
        groundB: '#646978',
        accent: '#a8b0c8',
        liquid: '#6c72ff',
        sky: '#101429',
        fog: '#30364c',
      },
      gameplay: {
        moveMultiplier: 1.02,
        friction: 0.9,
        vision: 1.1,
        lowGravityMultiplier: 0.58,
      },
      generation: {
        cover: [9, 14],
        bushes: [0, 0],
        liquids: [0, 1],
        lamps: [4, 8],
        coverStyles: [STYLE.METAL, STYLE.ROCK, STYLE.CRYSTAL, STYLE.CRATE],
      },
    },
  });

  /**
   * 24 map.
   * recipe hanya mendeskripsikan bentuk permainan/layout.
   * Generator di bawah menerjemahkannya menjadi grid.
   */
  const MAPS = Object.freeze({
    'green-crossroads': {
      biome: 'grassland',
      label: 'Green Crossroads',
      recipe: 'crossroads',
      description: 'Empat jalur bertemu di arena tengah dengan cover ringan.',
    },
    'river-fort': {
      biome: 'grassland',
      label: 'River Fort',
      recipe: 'river',
      description: 'Sungai membelah map, dua bridge utama dan fort kecil di tengah.',
    },
    'hedge-ring': {
      biome: 'grassland',
      label: 'Hedge Ring',
      recipe: 'ring',
      description: 'Lingkar semak dan batu mengitari center fight.',
    },

    'dune-cross': {
      biome: 'desert',
      label: 'Dune Cross',
      recipe: 'crossroads',
      description: 'Sightline panjang dengan cover jarang dan batu besar.',
    },
    'dry-canyon': {
      biome: 'desert',
      label: 'Dry Canyon',
      recipe: 'lanes',
      description: 'Tiga lane utama dibatasi canyon wall.',
    },
    'sunken-temple': {
      biome: 'desert',
      label: 'Sunken Temple',
      recipe: 'courtyard',
      description: 'Reruntuhan simetris dengan courtyard berbahaya.',
    },

    'frozen-lake': {
      biome: 'snow',
      label: 'Frozen Lake',
      recipe: 'lake',
      description: 'Danau beku menjadi shortcut cepat tetapi licin.',
    },
    'ice-ridge': {
      biome: 'snow',
      label: 'Ice Ridge',
      recipe: 'lanes',
      description: 'Ridge batu es membentuk pertarungan tiga lane.',
    },
    'snow-fort': {
      biome: 'snow',
      label: 'Snow Fort',
      recipe: 'courtyard',
      description: 'Fort bersalju dengan pintu masuk sempit dan flank luar.',
    },

    'river-temple': {
      biome: 'jungle',
      label: 'River Temple',
      recipe: 'river',
      description: 'Sungai, bridge, bush rapat, dan reruntuhan di center.',
    },
    'canopy-maze': {
      biome: 'jungle',
      label: 'Canopy Maze',
      recipe: 'maze',
      description: 'Jalur pendek dengan banyak concealment dan flank.',
    },
    'waterfall-basin': {
      biome: 'jungle',
      label: 'Waterfall Basin',
      recipe: 'basin',
      description: 'Basin air dan cover alami mengitari center.',
    },

    'crater-ring': {
      biome: 'lava',
      label: 'Crater Ring',
      recipe: 'ring',
      description: 'Lava ring memaksa rotasi melalui beberapa bridge.',
    },
    'molten-cross': {
      biome: 'lava',
      label: 'Molten Cross',
      recipe: 'lava-cross',
      description: 'Empat aliran lava membagi map menjadi sektor.',
    },
    'blackstone-bridges': {
      biome: 'lava',
      label: 'Blackstone Bridges',
      recipe: 'river',
      description: 'Sungai lava lebar dengan bridge sebagai choke point utama.',
    },

    'bog-islands': {
      biome: 'swamp',
      label: 'Bog Islands',
      recipe: 'islands',
      description: 'Pulau-pulau kering dikelilingi lumpur dan rawa.',
    },
    'toxic-canals': {
      biome: 'swamp',
      label: 'Toxic Canals',
      recipe: 'river',
      description: 'Canal beracun membentuk jalur aman dan jalur berisiko.',
    },
    'sunken-ruins': {
      biome: 'swamp',
      label: 'Sunken Ruins',
      recipe: 'courtyard',
      description: 'Reruntuhan tenggelam dengan kabut dan concealment.',
    },

    'cliff-pass': {
      biome: 'mountain',
      label: 'Cliff Pass',
      recipe: 'lanes',
      description: 'Pass sempit dengan ruang duel dan jalur flank.',
    },
    'temple-steps': {
      biome: 'mountain',
      label: 'Temple Steps',
      recipe: 'courtyard',
      description: 'Reruntuhan bertingkat dengan center terbuka.',
    },
    'twin-peaks': {
      biome: 'mountain',
      label: 'Twin Peaks',
      recipe: 'split-center',
      description: 'Dua struktur besar menciptakan perebutan sisi kiri/kanan.',
    },

    'crater-grid': {
      biome: 'moon',
      label: 'Crater Grid',
      recipe: 'basin',
      description: 'Crater tersebar sebagai cover dan arena duel.',
    },
    'lunar-base': {
      biome: 'moon',
      label: 'Lunar Base',
      recipe: 'courtyard',
      description: 'Pangkalan modular dengan koridor pendek dan halaman tengah.',
    },
    'gravity-rifts': {
      biome: 'moon',
      label: 'Gravity Rifts',
      recipe: 'split-center',
      description: 'Zona low-gravity membelah center menjadi dua jalur.',
    },
  });

  const ARENA_VARIANTS = Object.freeze(
    Object.fromEntries(
      Object.entries(MAPS).map(([id, map]) => {
        const biome = BIOMES[map.biome];
        return [
          id,
          {
            label: map.label,
            description: map.description,
            icon: biome.icon,
            biome: map.biome,
          },
        ];
      }),
    ),
  );

  function mulberry32(seed) {
    let value = seed | 0;
    return function random() {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function index(x, y) {
    return y * SIZE + x;
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  }

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function pick(rng, items) {
    return items[Math.floor(rng() * items.length)];
  }

  function makeCell(kind = CELL.EMPTY, style = null, meta = null) {
    return { kind, style, meta };
  }

  function mirror4(x, y) {
    return [
      [x, y],
      [SIZE - 1 - x, y],
      [x, SIZE - 1 - y],
      [SIZE - 1 - x, SIZE - 1 - y],
    ];
  }

  function key(x, y) {
    return `${x}:${y}`;
  }

  function generate(mapId, seed = Date.now() | 0) {
    const map = MAPS[mapId] || MAPS['green-crossroads'];
    const biome = BIOMES[map.biome];
    const rng = mulberry32((seed ^ hashString(mapId)) | 0);
    const cells = Array.from({ length: CELL_COUNT }, () => makeCell());
    const protectedTiles = new Set();
    const hazards = [];
    const landmarks = [];
    const lamps = [];
    const boxSpots = [];

    const setCell = (x, y, kind, style = null, meta = null, force = false) => {
      if (!inside(x, y)) return false;
      const i = index(x, y);
      if (!force && protectedTiles.has(key(x, y))) return false;
      if (!force && cells[i].kind !== CELL.EMPTY) return false;
      cells[i] = makeCell(kind, style, meta);
      return true;
    };

    const replaceCell = (x, y, kind, style = null, meta = null) => {
      if (!inside(x, y)) return false;
      if (protectedTiles.has(key(x, y))) return false;
      cells[index(x, y)] = makeCell(kind, style, meta);
      return true;
    };

    // Outer wall: tetap kompatibel dengan asumsi existing engine.
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (x < BORDER || y < BORDER || x >= SIZE - BORDER || y >= SIZE - BORDER) {
          cells[index(x, y)] = makeCell(CELL.WALL, STYLE.ROCK, { indestructible: true });
        }
      }
    }

    // Spawn safety.
    for (const [sx, sy] of DEFAULT_SPAWNS) {
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (inside(sx + ox, sy + oy)) protectedTiles.add(key(sx + ox, sy + oy));
        }
      }
    }

    // Jaga center minimal agar tidak langsung tertutup random cover.
    for (let y = 19; y <= 24; y++) {
      for (let x = 19; x <= 24; x++) protectedTiles.add(key(x, y));
    }

    const symmetric = (x, y, kind, style, meta) => {
      for (const [mx, my] of mirror4(x, y)) setCell(mx, my, kind, style, meta);
    };

    const wallLine = (x, y, length, horizontal, style) => {
      for (let i = 0; i < length; i++) {
        symmetric(x + (horizontal ? i : 0), y + (horizontal ? 0 : i), CELL.WALL, style);
      }
    };

    const blob = (kind, count, startX, startY, style = null, meta = null) => {
      const frontier = [[startX, startY]];
      const used = new Set();
      for (let tries = 0; tries < count * 10 && used.size < count; tries++) {
        const [cx, cy] = frontier[Math.floor(rng() * frontier.length)];
        const id = key(cx, cy);
        if (!used.has(id)) {
          used.add(id);
          symmetric(cx, cy, kind, style, meta);
        }
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        const [dx, dy] = pick(rng, dirs);
        const nx = Math.max(3, Math.min(20, cx + dx));
        const ny = Math.max(3, Math.min(20, cy + dy));
        frontier.push([nx, ny]);
      }
    };

    const bridgeAcrossHorizontal = (y, x1, x2) => {
      for (let x = x1; x <= x2; x++) replaceCell(x, y, CELL.BRIDGE, STYLE.STONE, { bridge: true });
    };

    const bridgeAcrossVertical = (x, y1, y2) => {
      for (let y = y1; y <= y2; y++) replaceCell(x, y, CELL.BRIDGE, STYLE.STONE, { bridge: true });
    };

    function placeRecipe() {
      switch (map.recipe) {
        case 'crossroads': {
          wallLine(9, 14, 5, true, pick(rng, biome.generation.coverStyles));
          wallLine(14, 9, 5, false, pick(rng, biome.generation.coverStyles));
          wallLine(15, 18, 3, true, pick(rng, biome.generation.coverStyles));
          landmarks.push({ type: 'central-crossroads', x: 21.5, z: 21.5 });
          break;
        }

        case 'lanes': {
          for (const x of [10, 15]) {
            wallLine(x, 7, randInt(rng, 5, 8), false, pick(rng, biome.generation.coverStyles));
            wallLine(x, 17, randInt(rng, 3, 5), false, pick(rng, biome.generation.coverStyles));
          }
          wallLine(7, 13, 5, true, pick(rng, biome.generation.coverStyles));
          landmarks.push({ type: 'three-lanes', x: 21.5, z: 21.5 });
          break;
        }

        case 'courtyard': {
          const style = map.biome === 'moon' ? STYLE.METAL : STYLE.RUIN;
          wallLine(13, 13, 6, true, style);
          wallLine(13, 13, 6, false, style);
          wallLine(13, 18, 6, true, style);
          wallLine(18, 13, 6, false, style);
          // Door gaps.
          for (const [x, y] of [[15, 13], [13, 15], [18, 16], [16, 18]]) {
            replaceCell(x, y, CELL.EMPTY);
            for (const [mx, my] of mirror4(x, y)) replaceCell(mx, my, CELL.EMPTY);
          }
          landmarks.push({ type: 'courtyard', x: 21.5, z: 21.5 });
          break;
        }

        case 'river': {
          const liquidKind = map.biome === 'lava' ? CELL.HAZARD : CELL.WATER;
          const hazardType = map.biome === 'lava' ? 'lava' : map.biome === 'swamp' ? 'toxic' : 'water';
          for (let y = 3; y < SIZE - 3; y++) {
            const wobble = Math.round(Math.sin(y * 0.55) * 1.5);
            for (let w = -1; w <= 1; w++) {
              const x = 21 + wobble + w;
              if (!protectedTiles.has(key(x, y))) {
                cells[index(x, y)] = makeCell(liquidKind, null, { hazardType });
                if (liquidKind === CELL.HAZARD) hazards.push({ x, y, type: hazardType });
              }
            }
          }
          bridgeAcrossHorizontal(11, 19, 24);
          bridgeAcrossHorizontal(21, 19, 24);
          bridgeAcrossHorizontal(32, 19, 24);
          landmarks.push({ type: 'river', x: 21.5, z: 21.5 });
          break;
        }

        case 'ring': {
          const ringKind = map.biome === 'lava' ? CELL.HAZARD : CELL.BUSH;
          const hazardType = map.biome === 'lava' ? 'lava' : null;
          const cx = 21.5;
          const cy = 21.5;
          for (let y = 7; y <= 36; y++) {
            for (let x = 7; x <= 36; x++) {
              const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
              if (d > 10 && d < 12.3 && !protectedTiles.has(key(x, y))) {
                cells[index(x, y)] = makeCell(ringKind, ringKind === CELL.BUSH ? STYLE.TREE : null, { hazardType });
                if (ringKind === CELL.HAZARD) hazards.push({ x, y, type: hazardType });
              }
            }
          }
          // 4 gates through ring.
          for (let d = -1; d <= 1; d++) {
            replaceCell(21 + d, 10, CELL.BRIDGE, STYLE.STONE);
            replaceCell(21 + d, 33, CELL.BRIDGE, STYLE.STONE);
            replaceCell(10, 21 + d, CELL.BRIDGE, STYLE.STONE);
            replaceCell(33, 21 + d, CELL.BRIDGE, STYLE.STONE);
          }
          landmarks.push({ type: map.biome === 'lava' ? 'crater' : 'ring-garden', x: cx, z: cy });
          break;
        }

        case 'lake': {
          for (let y = 14; y <= 29; y++) {
            for (let x = 12; x <= 31; x++) {
              const dx = (x - 21.5) / 10;
              const dy = (y - 21.5) / 8;
              if (dx * dx + dy * dy <= 1) {
                if (!protectedTiles.has(key(x, y))) {
                  cells[index(x, y)] = makeCell(CELL.ICE, null, { hazardType: 'ice' });
                  hazards.push({ x, y, type: 'ice' });
                }
              }
            }
          }
          for (const [x, y] of [[12, 12], [15, 9], [17, 14]]) {
            symmetric(x, y, CELL.WALL, STYLE.ICE_ROCK);
          }
          landmarks.push({ type: 'frozen-lake', x: 21.5, z: 21.5 });
          break;
        }

        case 'maze': {
          for (let n = 0; n < 6; n++) {
            const x = randInt(rng, 6, 18);
            const y = randInt(rng, 6, 18);
            wallLine(x, y, randInt(rng, 3, 6), rng() < 0.5, STYLE.TREE);
            blob(CELL.BUSH, randInt(rng, 4, 8), randInt(rng, 5, 18), randInt(rng, 5, 18), STYLE.TREE);
          }
          landmarks.push({ type: 'dense-canopy', x: 21.5, z: 21.5 });
          break;
        }

        case 'basin': {
          for (let y = 12; y <= 31; y++) {
            for (let x = 12; x <= 31; x++) {
              const d = Math.hypot(x - 21.5, y - 21.5);
              if (d >= 7.5 && d <= 9.5 && rng() > 0.2) {
                const style = map.biome === 'moon' ? STYLE.ROCK : STYLE.STONE;
                setCell(x, y, CELL.WALL, style);
              }
            }
          }
          landmarks.push({ type: map.biome === 'moon' ? 'moon-crater' : 'natural-basin', x: 21.5, z: 21.5 });
          break;
        }

        case 'lava-cross': {
          for (let i = 4; i < SIZE - 4; i++) {
            if (i < 18 || i > 25) {
              for (const [x, y] of [[21, i], [22, i], [i, 21], [i, 22]]) {
                if (!protectedTiles.has(key(x, y))) {
                  cells[index(x, y)] = makeCell(CELL.HAZARD, null, { hazardType: 'lava' });
                  hazards.push({ x, y, type: 'lava' });
                }
              }
            }
          }
          bridgeAcrossHorizontal(10, 20, 23);
          bridgeAcrossHorizontal(33, 20, 23);
          bridgeAcrossVertical(10, 20, 23);
          bridgeAcrossVertical(33, 20, 23);
          landmarks.push({ type: 'molten-cross', x: 21.5, z: 21.5 });
          break;
        }

        case 'islands': {
          // Water/mud checker clusters with dry islands.
          for (let y = 5; y < SIZE - 5; y++) {
            for (let x = 5; x < SIZE - 5; x++) {
              const noise = Math.sin(x * 0.7) + Math.cos(y * 0.63) + Math.sin((x + y) * 0.31);
              if (noise > 1.25 && !protectedTiles.has(key(x, y))) {
                cells[index(x, y)] = makeCell(CELL.MUD, null, { hazardType: 'mud' });
                hazards.push({ x, y, type: 'mud' });
              }
            }
          }
          landmarks.push({ type: 'bog-islands', x: 21.5, z: 21.5 });
          break;
        }

        case 'split-center': {
          wallLine(12, 15, 8, false, pick(rng, biome.generation.coverStyles));
          wallLine(16, 12, 5, true, pick(rng, biome.generation.coverStyles));
          if (map.biome === 'moon') {
            for (let y = 17; y <= 26; y++) {
              for (let x = 19; x <= 24; x++) {
                if ((x + y) % 2 === 0 && !protectedTiles.has(key(x, y))) {
                  cells[index(x, y)] = makeCell(CELL.HAZARD, null, { hazardType: 'low-gravity' });
                  hazards.push({ x, y, type: 'low-gravity' });
                }
              }
            }
          }
          landmarks.push({ type: 'split-center', x: 21.5, z: 21.5 });
          break;
        }
      }
    }

    placeRecipe();

    // Generic biome cover after layout.
    const [coverMin, coverMax] = biome.generation.cover;
    const coverCount = randInt(rng, coverMin, coverMax);
    for (let c = 0; c < coverCount; c++) {
      const x = randInt(rng, 4, 20);
      const y = randInt(rng, 4, 20);
      const horizontal = rng() < 0.5;
      const length = randInt(rng, 2, 4);
      const style = pick(rng, biome.generation.coverStyles);
      wallLine(x, y, length, horizontal, style);
    }

    // Bush clusters.
    const [bushMin, bushMax] = biome.generation.bushes;
    const bushClusters = randInt(rng, bushMin, bushMax);
    for (let b = 0; b < bushClusters; b++) {
      blob(
        CELL.BUSH,
        randInt(rng, 3, map.biome === 'jungle' ? 10 : 6),
        randInt(rng, 4, 20),
        randInt(rng, 4, 20),
        map.biome === 'jungle' ? STYLE.TREE : null,
      );
    }

    // Swamp mud supplement.
    if (map.biome === 'swamp') {
      for (let n = 0; n < randInt(rng, 2, 4); n++) {
        blob(CELL.MUD, randInt(rng, 5, 10), randInt(rng, 5, 19), randInt(rng, 5, 19), null, { hazardType: 'mud' });
      }
    }

    // Lamps / beacons.
    const [lampMin, lampMax] = biome.generation.lamps;
    const lampCount = randInt(rng, lampMin, lampMax);
    let attempts = 0;
    while (lamps.length < lampCount * 4 && attempts++ < 200) {
      const x = randInt(rng, 6, 20);
      const y = randInt(rng, 6, 20);
      for (const [mx, my] of mirror4(x, y)) {
        if (!protectedTiles.has(key(mx, my)) && cells[index(mx, my)].kind === CELL.EMPTY) {
          cells[index(mx, my)] = makeCell(CELL.WALL, STYLE.LAMP, { lamp: true });
          lamps.push([mx, my]);
        }
      }
    }

    // Box spots — use empty traversable cells.
    attempts = 0;
    while (boxSpots.length < 16 && attempts++ < 500) {
      const x = randInt(rng, 4, SIZE - 5);
      const y = randInt(rng, 4, SIZE - 5);
      const cell = cells[index(x, y)];
      if (
        (cell.kind === CELL.EMPTY || cell.kind === CELL.BRIDGE) &&
        !protectedTiles.has(key(x, y)) &&
        boxSpots.every(([bx, by]) => Math.hypot(bx - x, by - y) >= 4)
      ) {
        boxSpots.push([x, y]);
      }
    }

    // Ensure spawn tiles themselves are empty.
    for (const [sx, sy] of DEFAULT_SPAWNS) {
      cells[index(sx, sy)] = makeCell(CELL.EMPTY);
    }

    // Keep the hazard index in sync with the final grid after bridges and
    // later biome supplements have replaced or added surface cells.
    hazards.length = 0;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (
        cell.meta?.hazardType &&
        (cell.kind === CELL.HAZARD || cell.kind === CELL.ICE || cell.kind === CELL.MUD)
      ) {
        hazards.push({ x: i % SIZE, y: Math.floor(i / SIZE), type: cell.meta.hazardType });
      }
    }

    const blueprint = {
      id: mapId,
      label: map.label,
      description: map.description,
      biome: map.biome,
      biomeLabel: biome.label,
      icon: biome.icon,
      seed,
      size: SIZE,
      cells,
      spawns: DEFAULT_SPAWNS.map((p) => [...p]),
      boxSpots,
      lampTiles: lamps,
      hazards,
      landmarks,
      palette: structuredCloneSafe(biome.palette),
      gameplay: structuredCloneSafe(biome.gameplay),
    };

    blueprint.validation = validate(blueprint);
    return blueprint;
  }

  function validate(blueprint) {
    const counts = {};
    for (const cell of blueprint.cells) counts[cell.kind] = (counts[cell.kind] || 0) + 1;

    const spawnClear = blueprint.spawns.every(([x, y]) => {
      const cell = blueprint.cells[index(x, y)];
      return cell.kind === CELL.EMPTY || cell.kind === CELL.BRIDGE || cell.kind === CELL.ICE;
    });

    return {
      valid: spawnClear && blueprint.boxSpots.length >= 8,
      spawnClear,
      boxSpotCount: blueprint.boxSpots.length,
      counts,
    };
  }

  /**
   * Fallback adapter untuk engine saat ini.
   *
   * Param:
   *   world = instance Zl
   *   blueprint = hasil generate()
   *   Z = enum tile existing world.js
   *   Fc = enum style existing world.js
   *
   * IMPORTANT:
   * - lava/toxic fallback ke WATER supaya aman sebelum hazard damage dibuat.
   * - ice/mud/bridge fallback ke EMPTY supaya tetap walkable.
   * - style biome baru fallback ke material existing.
   */
  function applyLegacyWorld(world, blueprint, Z, Fc) {
    if (!world || !blueprint || !Z || !Fc) throw new Error('applyLegacyWorld: missing world/Z/Fc');

    const styleMap = {
      [STYLE.ROCK]: Fc.ROCK,
      [STYLE.STONE]: Fc.STONE,
      [STYLE.CRATE]: Fc.CRATE,
      [STYLE.BARREL]: Fc.BARREL,
      [STYLE.CACTUS]: Fc.CACTUS,
      [STYLE.TREE]: Fc.STONE,
      [STYLE.ICE_ROCK]: Fc.ROCK,
      [STYLE.OBSIDIAN]: Fc.ROCK,
      [STYLE.RUIN]: Fc.STONE,
      [STYLE.METAL]: Fc.CRATE,
      [STYLE.LAMP]: Fc.LAMP,
      [STYLE.MUSHROOM]: Fc.BARREL,
      [STYLE.CRYSTAL]: Fc.ROCK,
    };

    const tileMap = {
      [CELL.EMPTY]: Z.EMPTY,
      [CELL.WALL]: Z.WALL,
      [CELL.BUSH]: Z.BUSH,
      [CELL.WATER]: Z.WATER,
      [CELL.HAZARD]: Z.WATER,
      [CELL.ICE]: Z.EMPTY,
      [CELL.MUD]: Z.EMPTY,
      [CELL.BRIDGE]: Z.EMPTY,
    };

    world.tiles.fill(Z.EMPTY);
    world.styles.fill(0);

    for (let i = 0; i < blueprint.cells.length; i++) {
      const cell = blueprint.cells[i];
      world.tiles[i] = tileMap[cell.kind] ?? Z.EMPTY;
      world.styles[i] = styleMap[cell.style] ?? 0;
    }

    world.spawns = blueprint.spawns.map((p) => [...p]);
    world.boxSpots = blueprint.boxSpots.map((p) => [...p]);
    world.lampTiles = blueprint.lampTiles.map((p) => [...p]);

    // Data semantic tambahan untuk implementasi biome renderer / gameplay.
    world.mapBlueprint = blueprint;
    world.biomeName = blueprint.biome;
    world.mapHazards = blueprint.hazards;
    world.mapLandmarks = blueprint.landmarks;
    world.biomePalette = blueprint.palette;
    world.biomeGameplay = blueprint.gameplay;

    return world;
  }

  function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h | 0;
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function listByBiome(biomeId) {
    return Object.entries(MAPS)
      .filter(([, map]) => map.biome === biomeId)
      .map(([id, map]) => ({ id, ...map }));
  }

  function randomMap(seed = Date.now() | 0, biomeId = null) {
    const rng = mulberry32(seed);
    const ids = Object.keys(MAPS).filter((id) => !biomeId || MAPS[id].biome === biomeId);
    return ids[Math.floor(rng() * ids.length)];
  }

  global.GBH_MAP_PACK = Object.freeze({
    version: '1.0.0',
    SIZE,
    BORDER,
    CELL,
    STYLE,
    BIOMES,
    MAPS,
    arenaVariants: ARENA_VARIANTS,
    generate,
    validate,
    applyLegacyWorld,
    listByBiome,
    randomMap,
  });
})(window);
