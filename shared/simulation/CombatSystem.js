import { getCharacterDef } from '../data/characters.js';
import { normalize2 } from '../utils/math.js';

let projectileSerial = 0;
let areaSerial = 0;

export function beginAttack(state, playerId, aimX, aimZ) {
  const player = state.players.get(playerId);
  if (!player || !player.alive || player.attackCooldown > 0 || player.spawnProtectionT > 0) return false;
  const attack = getCharacterDef(player.characterId).attack;
  const direction = normalize2(aimX, aimZ);
  player.input.aimX = direction.x;
  player.input.aimZ = direction.z;
  if (player.characterId === 'syafiah') {
    if (player.chargeStartedAt !== null) return false;
    player.chargeStartedAt = state.match.elapsed;
    state.events.push({ type: 'ATTACK_CHARGE', ownerId: player.id });
    return true;
  }
  return performAttack(state, player, attack, direction);
}

export function releaseAttack(state, playerId, aimX, aimZ) {
  const player = state.players.get(playerId);
  if (!player || !player.alive || player.characterId !== 'syafiah' || player.chargeStartedAt === null) return false;
  const attack = getCharacterDef(player.characterId).attack;
  const duration = Math.max(0, state.match.elapsed - player.chargeStartedAt);
  player.chargeStartedAt = null;
  const ratio = Math.min(1, duration / attack.chargeTime);
  const charged = {
    ...attack,
    damage: Math.round(attack.damage + (attack.maxDamage - attack.damage) * ratio),
    speed: attack.speed + (attack.maxSpeed - attack.speed) * ratio,
    range: attack.range + (attack.maxRange - attack.range) * ratio,
  };
  if (duration >= attack.chargeTime * 0.9 && duration <= attack.chargeTime * 1.15) charged.damage = Math.round(charged.damage * 1.1);
  const direction = normalize2(aimX, aimZ);
  state.events.push({ type: 'ATTACK_RELEASE', ownerId: player.id, ratio });
  return performAttack(state, player, charged, direction);
}

export function useSuper(state, playerId, payload = {}) {
  const player = state.players.get(playerId);
  const definition = player && getCharacterDef(player.characterId).super;
  if (!player || !definition || !player.alive || player.superCharge < 1 || player.spawnProtectionT > 0) return false;
  const direction = normalize2(payload.aimX ?? player.input.aimX, payload.aimZ ?? player.input.aimZ);
  player.input.aimX = direction.x;
  player.input.aimZ = direction.z;
  const requestedX = Number.isFinite(payload.targetX) ? payload.targetX : player.x + direction.x * definition.range;
  const requestedZ = Number.isFinite(payload.targetZ) ? payload.targetZ : player.z + direction.z * definition.range;
  const requestedDistance = Math.hypot(requestedX - player.x, requestedZ - player.z);
  const targetScale = requestedDistance > definition.range ? definition.range / requestedDistance : 1;
  const targetX = player.x + (requestedX - player.x) * targetScale;
  const targetZ = player.z + (requestedZ - player.z) * targetScale;
  player.superCharge = 0;
  player.attackCooldown = Math.max(player.attackCooldown, definition.cooldown || 0.2);
  player.attackSerial += 1;
  const result = executeSuper(state, player, definition, direction, targetX, targetZ);
  if (result) state.events.push({ type: 'SUPER_USED', ownerId: player.id, kind: definition.kind, attackSerial: player.attackSerial, targetX, targetZ });
  return result;
}

export function useItem(state, playerId) {
  const player = state.players.get(playerId);
  if (!player || !player.alive || !player.heldItem) return false;
  const kind = player.heldItem;
  if (kind === 'shield') player.shieldT = 3;
  else if (kind === 'speed') player.speedBoostT = 4;
  else if (kind === 'heal') player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.35));
  else if (kind === 'ammo') player.superCharge = Math.min(1, player.superCharge + 0.2);
  else if (kind === 'super') player.superCharge = Math.min(1, player.superCharge + 0.25);
  player.heldItem = null;
  state.events.push({ type: 'ITEM_USED', ownerId: player.id, kind });
  return true;
}

function performAttack(state, player, attack, direction) {
  player.attackCooldown = attack.cooldown;
  player.attackSerial = (player.attackSerial || 0) + 1;
  if (attack.kind === 'melee') {
    const comboStep = player.characterId === 'ello' ? (player.comboStep || 0) : 0;
    const comboValue = attack.combo ? attack.combo[comboStep] : attack.damage;
    const damage = typeof comboValue === 'object' ? comboValue.damage : comboValue;
    if (attack.combo) player.comboStep = (comboStep + 1) % attack.combo.length;
    hitArc(state, player, direction, attack.range, attack.arc || Math.PI, damage, attack.radius || 0.45);
    if (typeof comboValue === 'object' && comboValue.lunge) {
      player.x += direction.x * comboValue.lunge;
      player.z += direction.z * comboValue.lunge;
      const resolved = state.collision?.resolveCircle(player.x, player.z, 0.45) || { x: player.x, z: player.z };
      player.x = resolved.x; player.z = resolved.z;
    }
    state.events.push({ type: 'MELEE_SWING', ownerId: player.id, attackSerial: player.attackSerial, comboStep });
    return true;
  }
  for (let index = 0; index < attack.count; index += 1) {
    const offset = attack.count === 1 ? 0 : (index - (attack.count - 1) / 2) * (attack.spread || 0);
    const angle = Math.atan2(direction.x, direction.z) + offset;
    spawnProjectile(state, player, attack, Math.sin(angle), Math.cos(angle));
  }
  return true;
}

function executeSuper(state, player, attack, direction, targetX, targetZ) {
  if (attack.kind === 'spread' || attack.kind === 'burst') {
    for (let index = 0; index < attack.count; index += 1) {
      const offset = attack.count === 1 ? 0 : (index - (attack.count - 1) / 2) * (attack.spread || 0.035);
      const angle = Math.atan2(direction.x, direction.z) + offset;
      spawnProjectile(state, player, attack, Math.sin(angle), Math.cos(angle), true);
    }
    return true;
  }
  if (attack.kind === 'explosion') {
    hitRadius(state, player, targetX, targetZ, attack.radius, attack.damage, attack.knockback);
    state.events.push({ type: 'EXPLOSION', ownerId: player.id, x: targetX, z: targetZ, radius: attack.radius, super: true });
    return true;
  }
  if (attack.kind === 'leap' || attack.kind === 'dash') {
    const originX = player.x; const originZ = player.z;
    const range = Math.min(attack.range, Math.hypot(targetX - originX, targetZ - originZ) || attack.range);
    player.x += direction.x * range; player.z += direction.z * range;
    const resolved = state.collision?.resolveCircle(player.x, player.z, 0.45) || { x: player.x, z: player.z };
    player.x = resolved.x; player.z = resolved.z;
    hitSegment(state, player, originX, originZ, player.x, player.z, attack.damage, attack.radius);
    state.events.push({ type: 'SUPER_DASH', ownerId: player.id, fromX: originX, fromZ: originZ, toX: player.x, toZ: player.z });
    return true;
  }
  if (attack.kind === 'iaido') {
    player.parryT = attack.guardDuration;
    hitSegment(state, player, player.x, player.z, targetX, targetZ, attack.damage, attack.radius);
    state.events.push({ type: 'PARRY_WINDOW', ownerId: player.id, duration: attack.guardDuration });
    return true;
  }
  if (attack.kind === 'arrow-shower') {
    const id = `area_${state.tick}_${areaSerial += 1}`;
    state.areaEffects.set(id, { id, ownerId: player.id, kind: attack.kind, x: targetX, z: targetZ, radius: attack.radius, damage: attack.damage, remaining: attack.warningDelay + attack.waveCount * attack.waveInterval, nextT: attack.warningDelay, interval: attack.waveInterval, waves: attack.waveCount });
    state.events.push({ type: 'SUPER_ZONE', id, ownerId: player.id, x: targetX, z: targetZ, radius: attack.radius, warning: attack.warningDelay, duration: attack.waveCount * attack.waveInterval });
    return true;
  }
  return false;
}

function spawnProjectile(state, player, attack, dirX, dirZ, isSuper = false) {
  const projectile = {
    id: `pr_${state.tick}_${projectileSerial += 1}`,
    ownerId: player.id,
    x: player.x,
    z: player.z,
    dirX,
    dirZ,
    speed: attack.speed,
    range: attack.range,
    radius: attack.radius || 0.16,
    damage: attack.damage,
    travelled: 0,
    returning: attack.returning === true,
    onReturn: false,
    pierce: attack.pierce === true,
    splashRadius: attack.splashRadius || 0,
    hitIds: new Set(),
    isSuper,
  };
  state.projectiles.set(projectile.id, projectile);
  state.events.push({ type: 'PROJECTILE_SPAWN', projectile: serializeProjectile(projectile) });
}

export function stepProjectiles(state, dt) {
  for (const [id, projectile] of state.projectiles) {
    const previousX = projectile.x; const previousZ = projectile.z;
    const distance = projectile.speed * dt;
    projectile.x += projectile.dirX * distance; projectile.z += projectile.dirZ * distance; projectile.travelled += distance;
    let removed = false;
    if (projectile.onReturn) {
      const owner = state.players.get(projectile.ownerId);
      if (owner && Math.hypot(projectile.x - owner.x, projectile.z - owner.z) <= projectile.radius + 0.35) removed = true;
      if (projectile.travelled >= projectile.range) removed = true;
    } else if (projectile.travelled >= projectile.range) {
      if (projectile.returning) {
        const owner = state.players.get(projectile.ownerId);
        if (owner) {
          const direction = normalize2(owner.x - projectile.x, owner.z - projectile.z);
          projectile.dirX = direction.x; projectile.dirZ = direction.z; projectile.onReturn = true; projectile.travelled = 0; projectile.hitIds.clear();
          state.events.push({ type: 'PROJECTILE_RETURN', projectileId: projectile.id });
        } else removed = true;
      } else removed = true;
    }
    for (const target of state.players.values()) {
      if (target.id === projectile.ownerId || !target.alive || projectile.hitIds.has(target.id)) continue;
      if (!segmentHitsCircle(previousX, previousZ, projectile.x, projectile.z, target.x, target.z, projectile.radius + 0.45)) continue;
      projectile.hitIds.add(target.id);
      if (target.characterId === 'ello' && target.parryT > 0 && !projectile.isSuper) {
        target.parryT = 0;
        const owner = state.players.get(projectile.ownerId);
        if (owner) applyDamage(state, owner, 1500, target);
        state.events.push({ type: 'PARRY', ownerId: target.id, projectileId: projectile.id });
        continue;
      }
      if (projectile.splashRadius > 0) hitRadius(state, state.players.get(projectile.ownerId), projectile.x, projectile.z, projectile.splashRadius, projectile.damage);
      else applyDamage(state, target, projectile.damage, state.players.get(projectile.ownerId));
      const owner = state.players.get(projectile.ownerId);
      if (owner?.characterId === 'naka' && projectile.returning && projectile.onReturn) owner.speedBoostT = 1.5;
      if (!projectile.returning && !projectile.pierce && projectile.splashRadius === 0) removed = true;
    }
    if (removed) { state.projectiles.delete(id); state.events.push({ type: 'PROJECTILE_DESTROY', projectileId: id }); }
  }
}

export function stepAreaEffects(state, dt) {
  for (const [id, area] of state.areaEffects) {
    area.remaining -= dt; area.nextT -= dt;
    while (area.nextT <= 0 && area.waves > 0) {
      hitRadius(state, state.players.get(area.ownerId), area.x, area.z, area.radius, area.damage);
      area.waves -= 1; area.nextT += area.interval;
      state.events.push({ type: 'SUPER_WAVE', id, ownerId: area.ownerId, x: area.x, z: area.z, radius: area.radius });
    }
    if (area.remaining <= 0 || area.waves <= 0) { state.areaEffects.delete(id); state.events.push({ type: 'AREA_END', id }); }
  }
}

export function stepItems(state, dt) {
  for (const item of state.items.values()) {
    if (!item.active) {
      item.respawnT -= dt;
      if (item.respawnT <= 0) { item.active = true; state.events.push({ type: 'ITEM_RESPAWN', itemId: item.id, kind: item.kind, x: item.x, z: item.z }); }
      continue;
    }
    for (const player of state.players.values()) {
      if (!player.alive || player.heldItem || Math.hypot(player.x - item.x, player.z - item.z) > 0.85) continue;
      player.heldItem = item.kind; item.active = false; item.respawnT = 10;
      state.events.push({ type: 'ITEM_PICKUP', itemId: item.id, ownerId: player.id, kind: item.kind });
      break;
    }
  }
}

function hitArc(state, attacker, direction, range, arc, damage, radius) {
  const cosArc = Math.cos(arc / 2);
  for (const target of state.players.values()) {
    if (target.id === attacker.id || !target.alive) continue;
    const dx = target.x - attacker.x; const dz = target.z - attacker.z; const distance = Math.hypot(dx, dz);
    const dot = distance > 1e-8 ? (dx * direction.x + dz * direction.z) / distance : 1;
    if (distance <= range + radius && dot >= cosArc) applyDamage(state, target, damage, attacker);
  }
}

function hitSegment(state, attacker, ax, az, bx, bz, damage, radius = 0.65) {
  for (const target of state.players.values()) {
    if (target.id === attacker.id || !target.alive) continue;
    if (segmentHitsCircle(ax, az, bx, bz, target.x, target.z, radius + 0.45)) applyDamage(state, target, damage, attacker);
  }
}

function hitRadius(state, attacker, x, z, radius, damage, knockback = 0) {
  if (!attacker) return;
  for (const target of state.players.values()) {
    if (target.id === attacker.id || !target.alive || Math.hypot(target.x - x, target.z - z) > radius) continue;
    applyDamage(state, target, damage, attacker);
    if (knockback > 0) {
      const direction = normalize2(target.x - x, target.z - z);
      target.x += direction.x * knockback; target.z += direction.z * knockback;
    }
  }
}

export function applyDamage(state, target, amount, attacker) {
  if (!target?.alive || target.spawnProtectionT > 0) return;
  const multiplier = target.shieldT > 0 ? 0.35 : 1;
  const dealt = Math.min(target.hp, Math.max(0, Math.round(amount * multiplier)));
  target.hp -= dealt;
  if (attacker?.characterId === 'fuse') target.slowT = Math.max(target.slowT || 0, 1);
  if (attacker && attacker.id !== target.id) attacker.superCharge = Math.min(1, attacker.superCharge + dealt / Math.max(1, attacker.maxHp) * 0.32);
  target.superCharge = Math.min(1, target.superCharge + dealt / Math.max(1, target.maxHp) * 0.12);
  state.events.push({ type: 'DAMAGE', targetId: target.id, attackerId: attacker?.id || null, amount: dealt });
  if (target.hp > 0) return;
  target.hp = 0; target.alive = false; target.deaths += 1; target.deadT = 0;
  if (attacker && attacker.id !== target.id) attacker.kills += 1;
  state.events.push({ type: 'DEATH', targetId: target.id, attackerId: attacker?.id || null, kills: attacker?.kills || 0 });
}

function segmentHitsCircle(ax, az, bx, bz, cx, cz, radius) {
  const dx = bx - ax; const dz = bz - az; const lengthSquared = dx * dx + dz * dz;
  const amount = lengthSquared > 1e-8 ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / lengthSquared)) : 0;
  const closestX = ax + dx * amount; const closestZ = az + dz * amount;
  return Math.hypot(cx - closestX, cz - closestZ) <= radius;
}

function serializeProjectile(projectile) {
  const { hitIds, ...data } = projectile;
  return data;
}
