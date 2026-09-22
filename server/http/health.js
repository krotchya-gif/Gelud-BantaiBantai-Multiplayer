export function healthPayload({ roomManager, registry, startedAt }) {
  let players = 0;
  for (const room of roomManager.roomsById.values()) players += room.players.size;
  return {
    status: 'ok',
    rooms: roomManager.roomsById.size,
    players,
    connections: registry.sessionsBySocketId.size,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  };
}
