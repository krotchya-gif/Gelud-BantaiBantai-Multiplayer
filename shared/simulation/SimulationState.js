import { characterMaxAmmo, characterUsesAmmo, FLICKER, getCharacterDef } from '../data/characters.js';
import { buildSpawnPoints, getMapDefinition } from '../maps/MapDefinitions.js';

export function createSimulationState({ mode = 'deathmatch', mapId = 'open', mapSeed = 0, matchSeed = 0, players = [], spawnPoints = null } = {}) {
  const map = getMapDefinition(mapId);
  const rules = {
    deathmatch: { timeLimit: 300, respawn: true, respawnDelay: 5, spawnProtection: 2, targetKills: 50, gas: false },
    classic: { timeLimit: 205, respawn: false, respawnDelay: 0, spawnProtection: 0, targetKills: 0, gas: true },
    blitz: { timeLimit: 112, respawn: false, respawnDelay: 0, spawnProtection: 0, targetKills: 0, gas: true },
  }[mode] || { timeLimit: 300, respawn: true, respawnDelay: 5, spawnProtection: 2, targetKills: 50, gas: false };
  const state = {
    tick: 0,
    match: {
      mode,
      status: 'running',
      elapsed: 0,
      remaining: rules.timeLimit,
      timeLimit: rules.timeLimit,
      targetKills: rules.targetKills,
      respawn: rules.respawn,
      respawnDelay: rules.respawnDelay,
      spawnProtection: rules.spawnProtection,
      gas: rules.gas,
      mapId,
      mapSeed,
      matchSeed,
      nextTrapAt: 60,
      winnerId: null,
      endReason: null,
      gasTickT: 0,
      gasTicks: 0,
    },
    players: new Map(),
    projectiles: new Map(),
    items: new Map(),
    hazards: new Map(),
    traps: new Map(),
    nextTrapId: 1,
    areaEffects: new Map(),
    spawnPoints: spawnPoints?.length ? spawnPoints.map((point) => ({ ...point })) : buildSpawnPoints(Math.max(1, players.length)),
    nextSpawnIndex: 0,
    events: [],
  };
  seedItems(state);
  for (const player of players) addPlayerState(state, player, { x: player.x, z: player.z });
  return state;
}

export function addPlayerState(state, player, position = {}) {
  const character = getCharacterDef(player.characterId);
  state.players.set(player.id, {
    id: player.id,
    name: player.name,
    characterId: character.id,
    x: Number.isFinite(position.x) ? position.x : 0,
    z: Number.isFinite(position.z) ? position.z : 0,
    velX: 0,
    velZ: 0,
    facing: 0,
    hp: character.maxHp,
    maxHp: character.maxHp,
    alive: true,
    connected: player.connected !== false,
    kills: 0,
    deaths: 0,
    superCharge: Number.isFinite(player.superCharge) ? player.superCharge : 0,
    heldItems: Array.isArray(player.heldItems)
      ? [player.heldItems[0] || null, player.heldItems[1] || null]
      : [player.heldItem || null, null],
    heldItem: Array.isArray(player.heldItems) ? player.heldItems[0] || null : player.heldItem || null,
    shieldT: 0,
    parryT: 0,
    speedBoostT: 0,
    slowT: 0,
    slowEffects: new Map(),
    hardCCT: 0,
    hardCCRecoveryT: 0,
    airborneT: 0,
    leapState: null,
    skillCooldowns: [0, 0],
    skill2Charge: null,
    gojoBarrier: false,
    gojoBarrierReadyAt: 10,
    sukunaBasicHits: new Map(),
    bleeds: new Map(),
    burns: new Map(),
    sukunaRushT: 0,
    sukunaPassiveReadyAt: 0,
    deadT: 0,
    spawnProtectionT: 0,
    input: { seq: 0, moveX: 0, moveZ: 0, aimX: 0, aimZ: 1 },
    // Inputs are consumed one simulation tick at a time. Keeping the queue on
    // the authoritative state makes bursty WebSocket delivery deterministic
    // and lets the client replay exactly the inputs acknowledged by the server.
    pendingInputs: [],
    lastReceivedInputSeq: 0,
    lastProcessedInputSeq: 0,
    attackCooldown: 0,
    ammo: characterUsesAmmo(character.id) ? characterMaxAmmo(character.id) : 0,
    reloadT: 0,
    flickerReadyAt: FLICKER.cooldown,
    flickerInvulnT: 0,
    flickerState: null,
    itemSpeedT: 0,
    burstT: 0,
    burstState: null,
    attackSerial: 0,
    comboStep: 0,
    comboResetT: 0,
    chargeStartedAt: null,
    iaidoState: null,
    iaidoEmpowered: false,
    lastCombat: -10,
    regenT: 0,
    stationaryT: 0,
    scatterHits: new Map(),
    voltChain: 0,
    lastVoltTargetId: null,
    lastVoltHit: -10,
  });
}

const ITEM_KINDS = Object.freeze(['heal', 'shield', 'speed', 'ammo', 'super']);

function seedItems(state) {
  const points = [
    { x: 0, z: 12 }, { x: 12, z: 0 }, { x: 0, z: -12 }, { x: -12, z: 0 },
    { x: 0, z: 0 },
  ];
  points.forEach((point, index) => {
    state.items.set(`item_${index + 1}`, {
      id: `item_${index + 1}`,
      kind: ITEM_KINDS[index % ITEM_KINDS.length],
      x: point.x,
      z: point.z,
      active: true,
      respawnT: 0,
    });
  });
}
