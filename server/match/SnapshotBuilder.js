export function buildSnapshot(simulation) {
  const { state } = simulation;
  const ack = {};
  const players = [];
  for (const player of state.players.values()) {
    ack[player.id] = player.lastProcessedInputSeq;
    players.push({
      id: player.id,
      characterId: player.characterId,
      x: Number(player.x.toFixed(4)),
      z: Number(player.z.toFixed(4)),
      velX: Number((player.velX || 0).toFixed(4)),
      velZ: Number((player.velZ || 0).toFixed(4)),
      facing: Number(player.facing.toFixed(4)),
      hp: player.hp,
      maxHp: player.maxHp,
      alive: player.alive,
      connected: player.connected,
      kills: player.kills,
      deaths: player.deaths,
      superCharge: Number((player.superCharge || 0).toFixed(4)),
      heldItem: player.heldItem || null,
      shieldT: Number((player.shieldT || 0).toFixed(3)),
      speedBoostT: Number((player.speedBoostT || 0).toFixed(3)),
      spawnProtectionT: Number((player.spawnProtectionT || 0).toFixed(3)),
    });
  }
  const projectiles = [...state.projectiles.values()].map(({ hitIds, ...projectile }) => ({
    ...projectile,
    x: Number(projectile.x.toFixed(4)),
    z: Number(projectile.z.toFixed(4)),
  }));
  return {
    tick: state.tick,
    serverTime: Date.now(),
    ack,
    match: { ...state.match },
    players,
    projectiles,
    items: [...state.items.values()].filter((item) => item.active).map(({ id, kind, x, z }) => ({ id, kind, x, z })),
    hazards: [...state.hazards.values()],
    areaEffects: [...state.areaEffects.values()].map(({ id, ownerId, kind, x, z, radius, remaining }) => ({ id, ownerId, kind, x, z, radius, remaining })),
  };
}
