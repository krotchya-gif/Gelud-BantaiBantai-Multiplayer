import { getCharacterDef } from '../data/characters.js';
import { normalize2 } from '../utils/math.js';

export function stepMovement(state, dt, collision) {
  for (const player of state.players.values()) {
    if (!player.alive) continue;
    const input = player.input;
    const direction = normalize2(input.moveX, input.moveZ);
    const mapSurface = state.match.mapId.includes('frozen') || state.match.mapId.includes('ice') ? 'ice' : state.match.mapId.includes('bog') || state.match.mapId.includes('toxic') || state.match.mapId.includes('sunken-ruins') ? 'mud' : 'normal';
    const surfaceMultiplier = mapSurface === 'ice' && player.characterId === 'ello' ? 1.08 : mapSurface === 'mud' ? 0.82 : 1;
    const speed = getCharacterDef(player.characterId).speed * (player.speedBoostT > 0 ? 1.35 : 1) * (player.slowT > 0 ? 0.85 : 1) * surfaceMultiplier;
    player.velX = direction.x * speed;
    player.velZ = direction.z * speed;
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
