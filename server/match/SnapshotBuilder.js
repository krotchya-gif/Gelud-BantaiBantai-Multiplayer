import { getCharacterDef } from '../../shared/data/characters.js';

export function buildSnapshot(simulation) {
  const { state } = simulation;
  const ack = {};
  const players = [];
  for (const player of state.players.values()) {
    ack[player.id] = player.lastProcessedInputSeq;
    players.push({
      id: player.id,
      name: player.name,
      characterId: player.characterId,
      characterName: getCharacterDef(player.characterId).name,
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
      heldItems: Array.isArray(player.heldItems) ? player.heldItems.slice(0, 2) : [player.heldItem || null, null],
      shieldT: Number((player.shieldT || 0).toFixed(3)),
      parryT: Number((player.parryT || 0).toFixed(3)),
      slowT: Number((player.slowT || 0).toFixed(3)),
      slowEffects: [...(player.slowEffects || [])].map(([sourceId, effect]) => ({
        sourceId,
        multiplier: Number(effect.multiplier.toFixed(3)),
        remaining: Number(effect.remaining.toFixed(3)),
      })),
      speedBoostT: Number((player.speedBoostT || 0).toFixed(3)),
      itemSpeedT: Number((player.itemSpeedT || 0).toFixed(3)),
      spawnProtectionT: Number((player.spawnProtectionT || 0).toFixed(3)),
      ammo: player.ammo,
      reloadT: Number((player.reloadT || 0).toFixed(3)),
      flickerRemaining: Number(Math.max(0, (player.flickerReadyAt || 0) - state.match.elapsed).toFixed(3)),
      flickerInvulnT: Number((player.flickerInvulnT || 0).toFixed(3)),
      attackCooldown: Number((player.attackCooldown || 0).toFixed(3)),
      skillCooldowns: (player.skillCooldowns || [0, 0]).map((remaining) => Number(remaining.toFixed(3))),
      skill2Charging: !!player.skill2Charge,
      skill2ChargeT: player.skill2Charge ? Number(Math.max(0, state.match.elapsed - player.skill2Charge.startedAt).toFixed(3)) : 0,
      gojoBarrier: player.gojoBarrier === true,
      gojoBarrierRemaining: Number(Math.max(0, (player.gojoBarrierReadyAt || 0) - state.match.elapsed).toFixed(3)),
      hardCCT: Number((player.hardCCT || 0).toFixed(3)),
      airborneT: Number((player.airborneT || 0).toFixed(3)),
      sukunaRushT: Number((player.sukunaRushT || 0).toFixed(3)),
      bleedT: Number(Math.max(0, ...[...(player.bleeds?.values() || [])].map((effect) => effect.remaining)).toFixed(3)),
      burnT: Number(Math.max(0, ...[...(player.burns?.values() || [])].map((effect) => effect.remaining)).toFixed(3)),
      comboStep: player.comboStep || 0,
      burstT: Number((player.burstT || 0).toFixed(3)),
      charging: player.chargeStartedAt !== null,
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
    traps: [...state.traps.values()].map((trap) => ({ ...trap, remaining: Number(trap.remaining.toFixed(3)) })),
    areaEffects: [...state.areaEffects.values()].map(({ id, ownerId, kind, x, z, radius, color, remaining, warning, activeDuration, waves, interval, activated }) => ({ id, ownerId, kind, x, z, radius, color, remaining, warning, activeDuration, waves, interval, activated })),
    brokenCover: state.collision?.getBrokenCoverTiles?.() || [],
  };
}
