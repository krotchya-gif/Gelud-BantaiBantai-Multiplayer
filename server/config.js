import { NETWORK_CONFIG } from '../shared/config/network.js';

function numberEnv(name, fallback, { min = -Infinity, max = Infinity } = {}) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

export function loadServerConfig(env = process.env) {
  return Object.freeze({
    nodeEnv: env.NODE_ENV || 'development',
    port: numberEnv('PORT', 3000, { min: 1, max: 65535 }),
    gameOrigin: env.GAME_ORIGIN || 'http://localhost:5173',
    tickRate: numberEnv('TICK_RATE', NETWORK_CONFIG.tickRate, { min: 1, max: 120 }),
    snapshotRate: numberEnv('SNAPSHOT_RATE', NETWORK_CONFIG.snapshotRate, { min: 1, max: 60 }),
    maxCatchupSteps: numberEnv('MAX_CATCHUP_STEPS', NETWORK_CONFIG.maxCatchupTicks, { min: 1, max: 12 }),
    maxPlayersPerRoom: numberEnv('MAX_PLAYERS_PER_ROOM', NETWORK_CONFIG.maxPlayersPerRoom, { min: 2, max: 8 }),
    serverBots: numberEnv('SERVER_BOTS', 0, { min: 0, max: 6 }),
    roomIdleTtlSeconds: numberEnv('ROOM_IDLE_TTL_SECONDS', NETWORK_CONFIG.roomIdleTtlSeconds, { min: 5, max: 3600 }),
    reconnectGraceSeconds: numberEnv('RECONNECT_GRACE_SECONDS', NETWORK_CONFIG.reconnectGraceSeconds, { min: 1, max: 120 }),
    logLevel: env.LOG_LEVEL || 'info',
  });
}
