import { getCharacterDef } from '../data/characters.js';
import { normalize2 } from '../utils/math.js';

export function stepMovement(state, dt, collision) {
  for (const player of state.players.values()) {
    if (!player.alive) continue;
    const input = player.input;
    const direction = normalize2(input.moveX, input.moveZ);
    const character = getCharacterDef(player.characterId);
    const surface = collision.surfaceAt?.(player.x, player.z) ?? 'normal';
    const gameplay = collision.layout?.gameplay ?? {};
    let speed = character.speed * (gameplay.moveMultiplier ?? 1);
    if (character.terrainAffinity?.type === 'bush' && surface === 'bush') speed *= character.terrainAffinity.moveMultiplier;
    if (surface === 'mud') speed *= gameplay.mudMoveMultiplier ?? 1;
    if (player.speedBoostT > 0) speed *= 1.35;
    if (player.slowT > 0) speed *= 0.85;
    if (player.chargeStartedAt != null && player.characterId === 'syafiah') speed *= 0.88;
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
    if (player.speedBoostT > 0) player.speedBoostT = Math.max(0, player.speedBoostT - dt);
    if (player.shieldT > 0) player.shieldT = Math.max(0, player.shieldT - dt);
    if (player.slowT > 0) player.slowT = Math.max(0, player.slowT - dt);
    if (player.spawnProtectionT > 0) player.spawnProtectionT = Math.max(0, player.spawnProtectionT - dt);
  }
}
