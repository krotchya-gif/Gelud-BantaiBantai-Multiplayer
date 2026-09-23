import { FLICKER, getCharacterDef } from '../data/characters.js';
import { normalize2 } from '../utils/math.js';

export function stepMovement(state, dt, collision) {
  for (const player of state.players.values()) {
    if (!player.alive) continue;
    if (player.flickerState) {
      const flicker = player.flickerState;
      flicker.t += dt;
      const progress = Math.min(1, flicker.t / FLICKER.duration);
      const eased = progress * progress * (3 - 2 * progress);
      const next = collision.resolveCircle(
        flicker.fromX + (flicker.toX - flicker.fromX) * eased,
        flicker.fromZ + (flicker.toZ - flicker.fromZ) * eased,
        0.45,
      );
      player.x = next.x;
      player.z = next.z;
      player.velX = flicker.dx * (flicker.toX - flicker.fromX) / FLICKER.duration;
      player.velZ = flicker.dz * (flicker.toZ - flicker.fromZ) / FLICKER.duration;
      player.stationaryT = 0;
      player.lastProcessedInputSeq = player.input.seq;
      if (progress >= 1) {
        player.flickerState = null;
        player.velX = 0;
        player.velZ = 0;
      }
      decrementMovementTimers(player, dt);
      continue;
    }
    const input = player.input;
    const direction = normalize2(input.moveX, input.moveZ);
    const character = getCharacterDef(player.characterId);
    const surface = collision.surfaceAt?.(player.x, player.z) ?? 'normal';
    const gameplay = collision.layout?.gameplay ?? {};
    let speed = character.speed * (gameplay.moveMultiplier ?? 1);
    if (direction.x === 0 && direction.z === 0 && Math.hypot(player.velX || 0, player.velZ || 0) < 0.28) player.stationaryT = Math.min(1, (player.stationaryT || 0) + dt);
    else player.stationaryT = 0;
    if (character.terrainAffinity?.type === 'bush' && surface === 'bush') speed *= character.terrainAffinity.moveMultiplier;
    if (surface === 'mud') speed *= gameplay.mudMoveMultiplier ?? 1;
    if (player.itemSpeedT > 0) speed *= 1.35;
    if (player.speedBoostT > 0) speed *= 1.15;
    if (player.slowT > 0) speed *= 0.85;
    if (player.chargeStartedAt != null && player.characterId === 'syafiah') speed *= 0.88;
    if (player.burstT > 0 && player.characterId !== 'ello') speed *= 0.82;
    if (surface === 'ice') {
      const traction = (gameplay.iceFriction ?? gameplay.friction ?? 1) * (character.terrainAffinity?.type === 'ice' ? character.terrainAffinity.tractionMultiplier : 1);
      const blend = 1 - Math.exp(-18 * Math.max(0.05, traction) * dt);
      player.velX += (direction.x * speed - player.velX) * blend;
      player.velZ += (direction.z * speed - player.velZ) * blend;
    } else {
      player.velX = direction.x * speed;
      player.velZ = direction.z * speed;
    }
    player.x += player.velX * dt;
    player.z += player.velZ * dt;
    if (Math.hypot(input.aimX, input.aimZ) > 1e-8) player.facing = Math.atan2(input.aimX, input.aimZ);
    const resolved = collision.resolveCircle(player.x, player.z, 0.45);
    player.x = resolved.x;
    player.z = resolved.z;
    player.lastProcessedInputSeq = input.seq;
    decrementMovementTimers(player, dt);
  }
}

function decrementMovementTimers(player, dt) {
  if (player.speedBoostT > 0) player.speedBoostT = Math.max(0, player.speedBoostT - dt);
  if (player.itemSpeedT > 0) player.itemSpeedT = Math.max(0, player.itemSpeedT - dt);
  if (player.burstT > 0) player.burstT = Math.max(0, player.burstT - dt);
  if (player.shieldT > 0) player.shieldT = Math.max(0, player.shieldT - dt);
  if (player.slowT > 0) player.slowT = Math.max(0, player.slowT - dt);
  if (player.spawnProtectionT > 0) player.spawnProtectionT = Math.max(0, player.spawnProtectionT - dt);
}
