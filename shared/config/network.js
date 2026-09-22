export const NETWORK_CONFIG = Object.freeze({
  protocolVersion: 1,
  tickRate: 30,
  snapshotRate: 15,
  maxCatchupTicks: 5,
  maxCatchupSteps: 5,
  maxPlayersPerRoom: 8,
  roomIdleTtlSeconds: 60,
  reconnectGraceSeconds: 10,
  interpolationDelayMs: 100,
});

export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
