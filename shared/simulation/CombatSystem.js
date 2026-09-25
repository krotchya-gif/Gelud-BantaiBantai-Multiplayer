import { characterMaxAmmo, characterUsesAmmo, FLICKER, getCharacterDef } from '../data/characters.js';
import { normalize2 } from '../utils/math.js';

let projectileSerial = 0;
let areaSerial = 0;

export function beginAttack(state, playerId, aimX, aimZ) {
  const player = state.players.get(playerId);
  if (!player || !player.alive || player.attackCooldown > 0 || player.burstState || player.flickerState || player.skillDashState || player.airborneT > 0 || player.spawnProtectionT > 0 || player.hardCCT > 0 || player.skill2Charge) return false;
  const attack = getCharacterDef(player.characterId).attack;
  if (characterUsesAmmo(player.characterId) && player.ammo < 1) return false;
  const direction = resolveAim(player, aimX, aimZ);
  cancelStealthForAction(state, player);
  player.input.aimX = direction.x;
  player.input.aimZ = direction.z;
  player.facing = Math.atan2(direction.x, direction.z);
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
  if (!player || !player.alive || player.characterId !== 'syafiah' || player.chargeStartedAt === null || player.skillDashState) return false;
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
  if (duration >= attack.chargeTime * 0.9 && player.pierceCoverShots > 0) {
    charged.pierceCover = true;
    player.pierceCoverShots -= 1;
  }
  if (state.collision?.surfaceAt?.(player.x, player.z) === 'low-gravity') {
    charged.range *= attack.terrainAffinity?.rangeMultiplier || getCharacterDef(player.characterId).terrainAffinity?.rangeMultiplier || 1.1;
  }
  if (duration >= attack.chargeTime * 0.9 && duration <= attack.chargeTime * 1.15) charged.damage = Math.round(charged.damage * 1.1);
  const direction = resolveAim(player, aimX, aimZ);
  player.input.aimX = direction.x;
  player.input.aimZ = direction.z;
  player.facing = Math.atan2(direction.x, direction.z);
  state.events.push({ type: 'ATTACK_RELEASE', ownerId: player.id, ratio });
  return performAttack(state, player, charged, direction);
}

export function useSuper(state, playerId, payload = {}) {
  const player = state.players.get(playerId);
  const definition = player && getCharacterDef(player.characterId).super;
  if (!player || !definition || !player.alive || player.burstState || player.flickerState || player.skillDashState || player.airborneT > 0 || player.superCharge < 1 || player.spawnProtectionT > 0 || player.hardCCT > 0 || player.skill2Charge) return false;
  const direction = resolveAim(player, payload.aimX, payload.aimZ);
  cancelStealthForAction(state, player);
  player.input.aimX = direction.x;
  player.input.aimZ = direction.z;
  player.facing = Math.atan2(direction.x, direction.z);
  const requestedX = Number.isFinite(payload.targetX) ? payload.targetX : player.x + direction.x * definition.range;
  const requestedZ = Number.isFinite(payload.targetZ) ? payload.targetZ : player.z + direction.z * definition.range;
  const requestedDistance = Math.hypot(requestedX - player.x, requestedZ - player.z);
  const rangeMultiplier = player.characterId === 'syafiah' && state.collision?.surfaceAt?.(player.x, player.z) === 'low-gravity'
    ? getCharacterDef(player.characterId).terrainAffinity?.rangeMultiplier || 1.1
    : 1;
  const effectiveRange = definition.range * rangeMultiplier;
  const targetScale = requestedDistance > effectiveRange ? effectiveRange / requestedDistance : 1;
  const targetX = player.x + (requestedX - player.x) * targetScale;
  const targetZ = player.z + (requestedZ - player.z) * targetScale;
  player.superCharge = 0;
  player.attackCooldown = Math.max(player.attackCooldown, definition.cooldown || 0.2);
  player.attackSerial += 1;
  const result = executeSuper(state, player, definition, direction, targetX, targetZ);
  if (result) state.events.push({ type: 'SUPER_USED', ownerId: player.id, kind: definition.kind, attackSerial: player.attackSerial, targetX, targetZ });
  return result;
}

export function useSkill(state, playerId, payload = {}) {
  const player = state.players.get(playerId);
  const skillNumber = payload.skill === 2 ? 2 : payload.skill === 1 ? 1 : 0;
  const phase = payload.phase || 'activate';
  const definition = player && getCharacterDef(player.characterId).skills?.[skillNumber - 1];
  if (!player || !definition || !player.alive || player.flickerState || player.skillDashState || player.airborneT > 0 || player.spawnProtectionT > 0 || player.hardCCT > 0 || player.burstState) return false;
  player.skillCooldowns ||= [0, 0];

  if (definition.id === 'kunai-dash' && phase === 'activate' && player.kunaiRecastTargetId && player.kunaiRecastUntil > state.match.elapsed) {
    const recast = recastKunai(state, player, definition);
    if (recast) cancelStealthForAction(state, player);
    return recast;
  }

  if (player.characterId === 'sukuna' && skillNumber === 2) {
    if (phase === 'start') {
      if (player.skill2Charge || player.skillCooldowns[1] > 0) return false;
      const direction = resolveAim(player, payload.aimX, payload.aimZ);
      player.input.aimX = direction.x; player.input.aimZ = direction.z;
      player.facing = Math.atan2(direction.x, direction.z);
      player.skillCooldowns[1] = definition.cooldown;
      player.skill2Charge = { startedAt: state.match.elapsed, dirX: direction.x, dirZ: direction.z };
      player.lastCombat = state.match.elapsed;
      state.events.push({ type: 'SKILL_CHARGE', ownerId: player.id, skill: 2, duration: definition.chargeTime });
      return true;
    }
    if (phase === 'cancel') {
      if (!player.skill2Charge) return false;
      player.skill2Charge = null;
      state.events.push({ type: 'SKILL_CHARGE_CANCEL', ownerId: player.id, skill: 2 });
      return true;
    }
    if (phase === 'release') {
      const charge = player.skill2Charge;
      if (!charge) return false;
      const held = Math.max(0, state.match.elapsed - charge.startedAt);
      player.skill2Charge = null;
      const charged = held >= definition.chargeTime;
      const direction = resolveAim(player, payload.aimX, payload.aimZ);
      state.events.push({ type: 'SKILL_CHARGE_RELEASE', ownerId: player.id, skill: 2, charged });
      spawnSukunaFlame(state, player, direction, charged ? definition.chargedDamage : definition.tapDamage, charged ? definition.chargedRange : definition.tapRange, charged ? definition : null);
      return true;
    }
    return false;
  }

  if (phase !== 'activate' || player.skillCooldowns[skillNumber - 1] > 0) return false;
  const direction = resolveAim(player, payload.aimX, payload.aimZ);
  const dashRequest = getRosterDashRequest(definition, direction);
  const dashPlan = dashRequest ? createSkillDashPlan(state, player, dashRequest) : null;
  if (dashRequest && !dashPlan) return false;
  cancelStealthForAction(state, player);
  player.input.aimX = direction.x; player.input.aimZ = direction.z;
  player.facing = Math.atan2(direction.x, direction.z);
  player.skillCooldowns[skillNumber - 1] = definition.cooldown;
  player.lastCombat = state.match.elapsed;
  state.events.push({ type: 'SKILL_USED', ownerId: player.id, skill: skillNumber, skillId: definition.id });

  if (player.characterId === 'gojo' && skillNumber === 1) {
    const point = clampTarget(state, player, payload.targetX, payload.targetZ, direction, definition.range);
    const id = `area_${state.tick}_${areaSerial += 1}`;
    state.areaEffects.set(id, {
      id, ownerId: player.id, kind: 'gojo-pull', x: point.x, z: point.z,
      radius: definition.radius, color: definition.color || 0x416cff, remaining: definition.duration,
      damage: definition.damage, slow: definition.slow, pullSpeed: definition.pullSpeed,
      hitIds: new Set(), blockedIds: new Set(),
    });
    state.events.push({ type: 'SKILL_ZONE', id, ownerId: player.id, kind: 'gojo-pull', x: point.x, z: point.z, radius: definition.radius, duration: definition.duration, color: definition.color || 0x416cff });
    return true;
  }

  if (player.characterId === 'gojo' && skillNumber === 2) {
    const end = clippedEndpoint(state, player.x, player.z, player.x + direction.x * definition.range, player.z + direction.z * definition.range, 0.08);
    const hits = [];
    for (const target of state.players.values()) {
      if (target.id === player.id || !target.alive || target.airborneT > 0 || !segmentHitsCircle(player.x, player.z, end.x, end.z, target.x, target.z, definition.width + 0.45)) continue;
      if (state.collision?.blocksSegment?.(player.x, player.z, target.x, target.z, 0.08)) continue;
      const distance = Math.hypot(target.x - player.x, target.z - player.z);
      hits.push({ target, distance });
    }
    for (const { target } of hits) {
      const dealt = applyDamage(state, target, definition.damage, player);
      if (dealt <= 0 || target.lastDamageBlocked || !target.alive) continue;
      const away = normalize2(target.x - player.x, target.z - player.z);
      if (definition.knockback > 0) {
        const collided = displaceTarget(state, target, away.x * definition.knockback, away.z * definition.knockback);
        if (collided) applyHardCC(state, target, definition.wallStun, 'stun', player);
      }
      state.events.push({ type: 'SKILL_HIT', ownerId: player.id, targetId: target.id, skill: 2, damage: dealt });
    }
    state.events.push({ type: 'SKILL_SLASH', ownerId: player.id, skill: 2, fromX: player.x, fromZ: player.z, toX: end.x, toZ: end.z, color: definition.color || 0xff456d });
    return true;
  }

  if (player.characterId === 'sukuna' && skillNumber === 1) {
    const end = clippedEndpoint(state, player.x, player.z, player.x + direction.x * definition.range, player.z + direction.z * definition.range, 0.08);
    const hits = [];
    for (const target of state.players.values()) {
      if (target.id === player.id || !target.alive || target.airborneT > 0 || !segmentHitsCircle(player.x, player.z, end.x, end.z, target.x, target.z, definition.width + 0.45)) continue;
      if (state.collision?.blocksSegment?.(player.x, player.z, target.x, target.z, 0.08)) continue;
      hits.push({ target, distance: Math.hypot(target.x - player.x, target.z - player.z) });
    }
    hits.sort((a, b) => a.distance - b.distance);
    for (const { target } of hits.slice(0, definition.maxTargets)) {
      const dealt = applyDamage(state, target, definition.damage, player);
      state.events.push({ type: 'SKILL_HIT', ownerId: player.id, targetId: target.id, skill: 1, damage: dealt });
    }
    state.events.push({ type: 'SKILL_SLASH', ownerId: player.id, skill: 1, fromX: player.x, fromZ: player.z, toX: end.x, toZ: end.z, color: 0xe52d45 });
    return true;
  }
  return useRosterSkill(state, player, definition, skillNumber, direction, dashPlan);
}

function getRosterDashRequest(definition, direction) {
  if (['combat-slide', 'tactical-roll', 'iron-charge', 'swift-flash'].includes(definition.id)) {
    return { direction, distance: definition.distance, duration: definition.duration };
  }
  if (definition.id === 'caltrops-trap') {
    return { direction: { x: -direction.x, z: -direction.z }, distance: definition.retreatDistance, duration: 0.28 };
  }
  return null;
}

function createSkillDashPlan(state, player, request) {
  const dir = normalize2(request.direction.x, request.direction.z);
  if (Math.hypot(dir.x, dir.z) <= 1e-8) return null;
  const end = clippedEndpoint(state, player.x, player.z, player.x + dir.x * request.distance, player.z + dir.z * request.distance, 0.45);
  const distance = Math.hypot(end.x - player.x, end.z - player.z);
  if (distance <= 0.08) return null;
  return { dirX: dir.x, dirZ: dir.z, distance, duration: request.duration, toX: end.x, toZ: end.z };
}

function useRosterSkill(state, player, definition, skillNumber, direction, dashPlan) {
  const id = definition.id;
  if (id === 'combat-slide' || id === 'tactical-roll' || id === 'iron-charge' || id === 'swift-flash') {
    if (!startSkillDash(state, player, definition, skillNumber, dashPlan)) return false;
    if (definition.damageReduction) {
      player.damageReduction = definition.damageReduction;
      player.damageReductionT = definition.duration;
    }
    if (definition.ccImmune) player.ccImmuneT = definition.duration;
    return true;
  }
  if (id === 'concussive-shell') {
    const cosArc = Math.cos(definition.arc / 2);
    for (const target of state.players.values()) {
      if (target.id === player.id || !target.alive || target.airborneT > 0) continue;
      const dx = target.x - player.x; const dz = target.z - player.z; const distance = Math.hypot(dx, dz);
      if (distance > definition.range + 0.45 || distance < 1e-8 || (dx * direction.x + dz * direction.z) / distance < cosArc) continue;
      if (state.collision?.blocksSegment?.(player.x, player.z, target.x, target.z, 0.08)) continue;
      const dealt = applyDamage(state, target, definition.damage, player);
      if (dealt > 0 && !target.lastDamageBlocked && target.alive) {
        const away = normalize2(dx, dz);
        if (displaceTarget(state, target, away.x * definition.knockback, away.z * definition.knockback)) applyHardCC(state, target, definition.wallStun, 'stun', player);
        state.events.push({ type: 'SKILL_HIT', ownerId: player.id, targetId: target.id, skill: skillNumber, damage: dealt });
      }
    }
    state.events.push({ type: 'SKILL_ARC', ownerId: player.id, skill: skillNumber, x: player.x, z: player.z, facing: player.facing, range: definition.range, arc: definition.arc, color: definition.color });
    return true;
  }
  if (id === 'piercing-bolt') {
    const bolt = { kind: 'burst', count: 1, damage: definition.damage, speed: definition.speed, range: definition.range, radius: 0.15, color: 0x89dcff, pierce: true, pierceCover: true, defenseBreak: definition.defenseBreak, defenseBreakDuration: definition.defenseBreakDuration, noKnockback: true };
    spawnProjectile(state, player, bolt, direction.x, direction.z);
    return true;
  }
  if (id === 'sticky-grenade') {
    const grenade = { kind: 'burst', count: 1, damage: definition.damage, speed: definition.speed, range: definition.range, radius: 0.18, color: definition.color, splashRadius: definition.blast, knockback: definition.knockback, stickyFuse: definition.fuse, stickyAttachToTarget: definition.attachToTarget, stickyAttachToCover: definition.attachToCover };
    spawnProjectile(state, player, grenade, direction.x, direction.z);
    return true;
  }
  if (id === 'smoke-screen') {
    const areaId = `area_${state.tick}_${areaSerial += 1}`;
    state.areaEffects.set(areaId, { id: areaId, ownerId: player.id, kind: 'smoke-screen', x: player.x, z: player.z, radius: definition.radius, color: definition.color, remaining: definition.duration, slow: definition.slow, hitIds: new Set() });
    state.events.push({ type: 'SKILL_ZONE', id: areaId, ownerId: player.id, kind: 'smoke-screen', x: player.x, z: player.z, radius: definition.radius, duration: definition.duration, color: definition.color });
    return true;
  }
  if (id === 'taunt-echo') {
    player.tauntEchoT = definition.duration;
    player.tauntEchoRadius = definition.radius;
    player.tauntEchoSlow = definition.slowAway;
    player.damageReduction = definition.damageReduction;
    player.damageReductionT = definition.duration;
    state.events.push({ type: 'SKILL_AURA', ownerId: player.id, skill: skillNumber, duration: definition.duration, radius: definition.radius, color: definition.color });
    return true;
  }
  if (id === 'chain-lightning') {
    const candidates = [...state.players.values()].filter((target) => {
      if (target.id === player.id || !target.alive || target.airborneT > 0) return false;
      const dx = target.x - player.x; const dz = target.z - player.z; const distance = Math.hypot(dx, dz);
      return distance <= definition.range + 0.45 && distance > 1e-8 && (dx * direction.x + dz * direction.z) / distance >= 0.78 && !state.collision?.blocksSegment?.(player.x, player.z, target.x, target.z, 0.08);
    }).sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
    const hitIds = new Set();
    let current = candidates[0];
    if (current) {
      hitIds.add(current.id);
      const dealt = applyDamage(state, current, definition.damage, player);
      if (dealt > 0 && !current.lastDamageBlocked) applyHardCC(state, current, definition.interruptDuration, 'stun', player);
      state.events.push({ type: 'SKILL_CHAIN_HIT', ownerId: player.id, targetId: current.id, skill: skillNumber, damage: dealt, jump: 0, color: definition.color });
      for (let jump = 1; jump <= definition.jumpCount; jump += 1) {
        const origin = current;
        current = [...state.players.values()].filter((target) => target.alive && target.airborneT <= 0 && !hitIds.has(target.id) && target.id !== player.id && Math.hypot(target.x - origin.x, target.z - origin.z) <= definition.jumpRange && !state.collision?.blocksSegment?.(origin.x, origin.z, target.x, target.z, 0.08)).sort((a, b) => Math.hypot(a.x - origin.x, a.z - origin.z) - Math.hypot(b.x - origin.x, b.z - origin.z))[0];
        if (!current) break;
        hitIds.add(current.id);
        const jumpDamage = applyDamage(state, current, definition.jumpDamage, player);
        if (jumpDamage > 0 && !current.lastDamageBlocked) applyHardCC(state, current, definition.interruptDuration, 'stun', player);
        state.events.push({ type: 'SKILL_CHAIN_HIT', ownerId: player.id, targetId: current.id, skill: skillNumber, damage: jumpDamage, jump, color: definition.color });
      }
    }
    return true;
  }
  if (id === 'overcharge-volt') {
    player.overchargeT = definition.duration;
    state.events.push({ type: 'SKILL_STATUS', ownerId: player.id, skill: skillNumber, status: 'overcharge', duration: definition.duration, color: definition.color });
    return true;
  }
  if (id === 'smoke-bomb') {
    player.stealthT = definition.duration;
    state.events.push({ type: 'SKILL_STATUS', ownerId: player.id, skill: skillNumber, status: 'stealth', duration: definition.duration, color: definition.color });
    return true;
  }
  if (id === 'kunai-dash') {
    const projectile = spawnProjectile(state, player, { kind: 'burst', count: 1, damage: definition.damage, speed: definition.speed, range: definition.range, radius: 0.12, color: definition.color, noKnockback: true, kunaiSkill: true }, direction.x, direction.z);
    player.kunaiRecastTargetId = null;
    player.kunaiRecastUntil = state.match.elapsed + definition.recastWindow;
    if (projectile) projectile.kunaiSkill = true;
    return true;
  }
  if (id === 'parry-stance') {
    player.skillParryT = definition.duration;
    player.skillParryFacing = player.facing;
    state.events.push({ type: 'SKILL_PARRY_WINDOW', ownerId: player.id, skill: skillNumber, duration: definition.duration, color: definition.color });
    return true;
  }
  if (id === 'eagle-eye') {
    player.eagleEyeT = definition.duration;
    player.pierceCoverShots = definition.pierceDestructibleCover;
    state.events.push({ type: 'SKILL_STATUS', ownerId: player.id, skill: skillNumber, status: 'eagle-eye', duration: definition.duration, color: definition.color });
    return true;
  }
  if (id === 'caltrops-trap') {
    if (!startSkillDash(state, player, definition, skillNumber, dashPlan)) return false;
    const trapId = `skill_trap_${state.tick}_${areaSerial += 1}`;
    state.skillTraps.set(trapId, { id: trapId, kind: 'caltrops', ownerId: player.id, x: player.x, z: player.z, radius: definition.radius, remaining: definition.trapDuration, slow: definition.slow, damagePerSecond: definition.damagePerSecond, damageDuration: definition.damageDuration, hitIds: new Set(), phase: 'armed' });
    state.events.push({ type: 'SKILL_TRAP_SET', id: trapId, kind: 'caltrops', ownerId: player.id, x: player.x, z: player.z, radius: definition.radius, remaining: definition.trapDuration, color: definition.color });
    return true;
  }
  return false;
}

function startSkillDash(state, player, definition, skill, plan) {
  if (!plan) return false;
  const { dirX, dirZ, distance, duration, toX, toZ } = plan;
  player.skillDashState = { skillId: definition.id, skill, fromX: player.x, fromZ: player.z, toX, toZ, dirX, dirZ, distance, duration, elapsed: 0, previousX: player.x, previousZ: player.z, hitIds: [], damage: definition.damage || 0, knockback: definition.knockback || 0, restoreAmmo: definition.restoreAmmo || 0 };
  state.events.push({ type: 'SKILL_DASH', ownerId: player.id, skill, skillId: definition.id, fromX: player.x, fromZ: player.z, toX, toZ, duration, leap: false });
  return true;
}

function recastKunai(state, player, definition) {
  const target = state.players.get(player.kunaiRecastTargetId);
  if (!target?.alive || target.airborneT > 0) { player.kunaiRecastTargetId = null; return false; }
  const targetX = target.x - Math.sin(target.facing) * definition.dashOffset;
  const targetZ = target.z - Math.cos(target.facing) * definition.dashOffset;
  const plan = createSkillDashPlan(state, player, { direction: { x: targetX - player.x, z: targetZ - player.z }, distance: Math.hypot(targetX - player.x, targetZ - player.z), duration: 0.12 });
  if (!startSkillDash(state, player, { ...definition, id: 'kunai-recast' }, 2, plan)) return false;
  player.kunaiRecastTargetId = null;
  player.kunaiRecastUntil = 0;
  return true;
}

function cancelStealthForAction(state, player) {
  if (player.stealthT > 0) {
    player.stealthT = 0;
    state.events.push({ type: 'STEALTH_END', ownerId: player.id });
  }
  if (player.smokeConcealed) player.smokeRevealT = 0.5;
}

function spawnSukunaFlame(state, player, direction, damage, range, chargedDefinition) {
  const attack = {
    kind: 'burst', count: 1, damage, speed: chargedDefinition?.projectileSpeed || 18,
    range, radius: 0.18, color: chargedDefinition?.color || 0xff642e,
    blast: chargedDefinition?.blast || 0,
    burnDamage: chargedDefinition?.burnDamage || 0,
    burnDuration: chargedDefinition?.burnDuration || 0,
  };
  spawnProjectile(state, player, attack, direction.x, direction.z);
}

function clampTarget(state, player, targetX, targetZ, direction, range) {
  const requestedX = Number.isFinite(targetX) ? targetX : player.x + direction.x * range;
  const requestedZ = Number.isFinite(targetZ) ? targetZ : player.z + direction.z * range;
  const deltaX = requestedX - player.x; const deltaZ = requestedZ - player.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const scale = distance > range ? range / distance : 1;
  const endX = player.x + deltaX * scale; const endZ = player.z + deltaZ * scale;
  return clippedEndpoint(state, player.x, player.z, endX, endZ, 0.08);
}

function clippedEndpoint(state, ax, az, bx, bz, radius = 0) {
  if (!state.collision?.blocksSegment?.(ax, az, bx, bz, radius)) return { x: bx, z: bz };
  const distance = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(distance / 0.12));
  let previous = { x: ax, z: az };
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    const point = { x: ax + (bx - ax) * progress, z: az + (bz - az) * progress };
    if (state.collision?.blocksSegment?.(ax, az, point.x, point.z, radius)) return previous;
    previous = point;
  }
  return previous;
}

function displaceTarget(state, target, dx, dz) {
  const beforeX = target.x; const beforeZ = target.z;
  const desiredX = beforeX + dx; const desiredZ = beforeZ + dz;
  const resolved = state.collision?.resolveCircle?.(desiredX, desiredZ, 0.45) || { x: desiredX, z: desiredZ };
  target.x = resolved.x; target.z = resolved.z;
  return Math.hypot(resolved.x - desiredX, resolved.z - desiredZ) > 0.08 || Math.hypot(resolved.x - beforeX, resolved.z - beforeZ) < Math.hypot(dx, dz) * 0.7;
}

function applySlowEffect(target, sourceId, multiplier, duration) {
  target.slowEffects ||= new Map();
  const current = target.slowEffects.get(sourceId);
  target.slowEffects.set(sourceId, { multiplier: Math.min(current?.multiplier ?? 1, 1 - multiplier), remaining: Math.max(current?.remaining || 0, duration) });
}

function applyHardCC(state, target, duration, kind, attacker) {
  if (!target?.alive || target.spawnProtectionT > 0 || target.flickerInvulnT > 0 || target.airborneT > 0 || target.ccImmuneT > 0) return;
  if (consumeGojoBarrier(state, target, attacker)) return;
  if (consumeSkillParry(state, target, attacker)) return;
  const base = Math.max(0, Math.min(1.5, duration));
  const adjusted = target.hardCCRecoveryT > 0 ? base * 0.65 : base;
  target.hardCCT = Math.max(target.hardCCT || 0, adjusted);
  target.hardCCRecoveryT = target.hardCCT + 2;
  interruptCharge(state, target);
  state.events.push({ type: 'HARD_CC', targetId: target.id, attackerId: attacker?.id || null, kind, duration: adjusted });
}

function interruptCharge(state, target) {
  if (target.skill2Charge) {
    target.skill2Charge = null;
    state.events.push({ type: 'SKILL_CHARGE_CANCEL', ownerId: target.id, skill: 2, reason: 'interrupted' });
  }
  if (target.chargeStartedAt !== null && target.chargeStartedAt !== undefined) {
    target.chargeStartedAt = null;
    state.events.push({ type: 'ATTACK_CHARGE_CANCEL', ownerId: target.id, reason: 'interrupted' });
  }
}

function consumeSkillParry(state, target, attacker, incoming = null) {
  if (!attacker || attacker.id === target.id || target.characterId !== 'ello' || target.skillParryT <= 0) return false;
  const hasIncomingDirection = Number.isFinite(incoming?.directionX) && Number.isFinite(incoming?.directionZ) && Math.hypot(incoming.directionX, incoming.directionZ) > 1e-8;
  const toSource = hasIncomingDirection
    ? normalize2(-incoming.directionX, -incoming.directionZ)
    : normalize2(attacker.x - target.x, attacker.z - target.z);
  const faceX = Math.sin(target.skillParryFacing || 0);
  const faceZ = Math.cos(target.skillParryFacing || 0);
  if (toSource.x * faceX + toSource.z * faceZ < Math.cos(Math.PI / 3)) return false;
  target.skillParryT = 0;
  target.parryEmpowerT = 2;
  target.iaidoEmpowered = true;
  state.events.push({ type: 'SKILL_PARRY', ownerId: target.id, attackerId: attacker.id, empowered: true });
  return true;
}

function applyBleed(target, owner, damage, duration) {
  target.bleeds ||= new Map();
  target.bleeds.set(owner.id, { damage, remaining: duration, nextT: 1, ticksRemaining: Math.ceil(duration) });
}

function recordSukunaBasicHit(state, attacker, target) {
  attacker.sukunaBasicHits ||= new Map();
  const previous = attacker.sukunaBasicHits.get(target.id);
  const count = previous && state.match.elapsed - previous.lastAt <= 1.5 ? previous.count + 1 : 1;
  attacker.sukunaBasicHits.set(target.id, { count, lastAt: state.match.elapsed });
  if (count >= 3) {
    attacker.sukunaBasicHits.set(target.id, { count: 0, lastAt: state.match.elapsed });
    applyBleed(target, attacker, 80, 3);
    state.events.push({ type: 'STATUS_APPLIED', targetId: target.id, sourceId: attacker.id, status: 'bleed', duration: 3, damage: 80 });
  }
}

function applyBurn(target, owner, damage, duration) {
  target.burns ||= new Map();
  target.burns.set(owner.id, { damage, remaining: duration, nextT: 1, ticksRemaining: Math.ceil(duration) });
  target.burnT = Math.max(target.burnT || 0, duration);
}

function detonateSukunaFlame(state, projectile, owner, x, z) {
  for (const target of state.players.values()) {
    if (target.id === projectile.ownerId || !target.alive || Math.hypot(target.x - x, target.z - z) > projectile.splashRadius + 0.45) continue;
    const dealt = applyDamage(state, target, projectile.damage, owner, { directionX: projectile.dirX, directionZ: projectile.dirZ, projectile: true });
    if (dealt > 0 && !target.lastDamageBlocked && target.alive && projectile.burnDamage > 0) {
      applyBurn(target, owner, projectile.burnDamage, projectile.burnDuration);
      state.events.push({ type: 'STATUS_APPLIED', targetId: target.id, sourceId: owner.id, status: 'burn', duration: projectile.burnDuration, damage: projectile.burnDamage });
    }
  }
  state.events.push({ type: 'EXPLOSION', ownerId: projectile.ownerId, x, z, radius: projectile.splashRadius, color: projectile.color, super: false });
}

function destroyCoverInRadius(state, x, z, radius) {
  if (!state.collision?.destroyCoverAt) return;
  const layout = state.collision.layout;
  if (!layout) return;
  const minX = Math.max(0, Math.floor(x - radius - layout.origin.x));
  const maxX = Math.min(layout.size - 1, Math.ceil(x + radius - layout.origin.x));
  const minZ = Math.max(0, Math.floor(z - radius - layout.origin.z));
  const maxZ = Math.min(layout.size - 1, Math.ceil(z + radius - layout.origin.z));
  for (let tileZ = minZ; tileZ <= maxZ; tileZ += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      const centerX = layout.origin.x + tileX + 0.5;
      const centerZ = layout.origin.z + tileZ + 0.5;
      if (Math.hypot(centerX - x, centerZ - z) > radius) continue;
      if (state.collision.destroyCoverAt(tileX, tileZ)) state.events.push({ type: 'COVER_BROKEN', tileX, tileZ });
    }
  }
}

export function useItem(state, playerId, slot = 0) {
  const player = state.players.get(playerId);
  const slotIndex = slot === 1 ? 1 : 0;
  if (!player || !player.alive) return false;
  player.heldItems ||= [player.heldItem || null, null];
  const kind = player.heldItems[slotIndex] || (slotIndex === 0 ? player.heldItem : null);
  if (!kind) return false;
  const canUse = kind === 'shield' ? player.shieldT <= 0
    : kind === 'speed' ? player.itemSpeedT <= 0
      : kind === 'heal' ? player.hp < player.maxHp
      : kind === 'ammo' ? (characterUsesAmmo(player.characterId) ? player.ammo < characterMaxAmmo(player.characterId) : player.superCharge < 1)
          : kind === 'super' ? player.superCharge < 1
            : false;
  if (!canUse) return false;
  if (kind === 'shield') player.shieldT = 3;
  else if (kind === 'speed') player.itemSpeedT = 4;
  else if (kind === 'heal') player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.35));
  else if (kind === 'ammo') {
    if (characterUsesAmmo(player.characterId)) {
      player.ammo = characterMaxAmmo(player.characterId);
      player.reloadT = 0;
    } else {
      player.superCharge = Math.min(1, player.superCharge + 0.2);
    }
  }
  else if (kind === 'super') player.superCharge = Math.min(1, player.superCharge + 0.25);
  player.heldItems[slotIndex] = null;
  player.heldItem = player.heldItems[0] || null;
  state.events.push({ type: 'ITEM_USED', ownerId: player.id, kind, slot: slotIndex });
  return true;
}

export function useFlicker(state, playerId, payload = {}) {
  const player = state.players.get(playerId);
  if (!player || !player.alive || player.spawnProtectionT > 0 || player.hardCCT > 0 || player.airborneT > 0 || player.burstState || player.skill2Charge || player.flickerState || player.skillDashState) return false;
  if ((player.flickerReadyAt ?? FLICKER.cooldown) > state.match.elapsed) return false;
  let direction = normalize2(payload.dirX ?? player.input.moveX, payload.dirZ ?? player.input.moveZ);
  if (Math.hypot(direction.x, direction.z) <= 1e-8) direction = normalize2(player.input.aimX, player.input.aimZ);
  if (Math.hypot(direction.x, direction.z) <= 1e-8) direction = normalize2(Math.sin(player.facing), Math.cos(player.facing));
  let distance = FLICKER.distance;
  while (distance > 0.2 && state.collision?.blocksSegment?.(player.x, player.z, player.x + direction.x * distance, player.z + direction.z * distance, 0.42)) {
    distance -= 0.22;
  }
  if (distance < 0.2) return false;
  const fromX = player.x;
  const fromZ = player.z;
  const target = state.collision?.resolveCircle?.(fromX + direction.x * distance, fromZ + direction.z * distance, 0.45) || {
    x: fromX + direction.x * distance,
    z: fromZ + direction.z * distance,
  };
  player.input.aimX = direction.x;
  player.input.aimZ = direction.z;
  player.facing = Math.atan2(direction.x, direction.z);
  player.flickerReadyAt = state.match.elapsed + FLICKER.cooldown;
  player.flickerInvulnT = FLICKER.invulnerability;
  player.flickerState = { fromX, fromZ, toX: target.x, toZ: target.z, dx: direction.x, dz: direction.z, t: 0 };
  state.events.push({ type: 'FLICKER', ownerId: player.id, fromX, fromZ, toX: target.x, toZ: target.z, duration: FLICKER.duration });
  return true;
}

function performAttack(state, player, attack, direction) {
  if (characterUsesAmmo(player.characterId)) {
    if (player.ammo < 1) return false;
    player.ammo -= 1;
  }
  player.attackCooldown = attack.cooldown || (attack.kind === 'lob' ? 0.3 : 0.22);
  player.lastCombat = state.match.elapsed;
  player.attackSerial = (player.attackSerial || 0) + 1;
  if (player.characterId === 'volt' && player.overchargeT > 0) attack = { ...attack, count: 4, pellets: 4 };
  if (player.characterId === 'ace' && player.stationaryT >= 0.45) {
    attack = { ...attack, damage: Math.round(attack.damage * 1.1) };
    player.stationaryT = 0;
  }
  if (attack.kind === 'burst' || attack.kind === 'melee') {
    let burstAttack = attack;
    let cooldown = attack.shotRecovery || attack.count * (attack.interval || 0.12) + 0.12;
    if (attack.combo) {
      const comboStep = player.comboStep || 0;
      const comboValue = attack.combo[comboStep] || attack.combo[0];
      burstAttack = { ...attack, damage: comboValue.damage, count: 1, combo: null, comboStep, lunge: comboValue.lunge || 0, pull: comboValue.pull || 0, push: comboValue.push || 0 };
      cooldown = comboValue.recovery || cooldown;
      player.comboStep = (comboStep + 1) % attack.combo.length;
      player.comboResetT = attack.comboReset || 0.75;
    }
    scheduleBurst(player, burstAttack, direction, false, cooldown);
    return true;
  }
  const count = Math.max(1, attack.count || attack.pellets || 1);
  for (let index = 0; index < count; index += 1) {
    const offset = count === 1 ? 0 : (index - (count - 1) / 2) * (attack.spread || 0);
    const angle = Math.atan2(direction.x, direction.z) + offset;
    spawnProjectile(state, player, attack, Math.sin(angle), Math.cos(angle));
  }
  return true;
}

function resolveAim(player, aimX, aimZ) {
  let direction = normalize2(aimX, aimZ);
  if (Math.hypot(direction.x, direction.z) > 1e-8) return direction;
  direction = normalize2(player.input.aimX, player.input.aimZ);
  if (Math.hypot(direction.x, direction.z) > 1e-8) return direction;
  return normalize2(Math.sin(player.facing || 0), Math.cos(player.facing || 0));
}

function executeSuper(state, player, attack, direction, targetX, targetZ) {
  if (attack.kind === 'burst' || attack.kind === 'melee') {
    scheduleBurst(player, attack, direction, true);
    return true;
  }
  if (attack.kind === 'spread' || attack.kind === 'lob') {
    const count = Math.max(1, attack.count || attack.pellets || 1);
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : (index - (count - 1) / 2) * (attack.spread || 0.035);
      const angle = Math.atan2(direction.x, direction.z) + offset;
      spawnProjectile(state, player, attack, Math.sin(angle), Math.cos(angle), true);
    }
    return true;
  }
  if (attack.kind === 'explosion') {
    hitRadius(state, player, targetX, targetZ, attack.radius, attack.damage, attack.knockback);
    state.events.push({ type: 'EXPLOSION', ownerId: player.id, x: targetX, z: targetZ, radius: attack.radius, color: attack.color, super: true });
    return true;
  }
  if (attack.kind === 'leap' || attack.kind === 'dash') {
    const originX = player.x; const originZ = player.z;
    const range = Math.min(attack.range, Math.hypot(targetX - originX, targetZ - originZ) || attack.range);
    player.x += direction.x * range; player.z += direction.z * range;
    const resolved = state.collision?.resolveCircle(player.x, player.z, 0.45) || { x: player.x, z: player.z };
    player.x = resolved.x; player.z = resolved.z;
    if (attack.kind === 'leap') {
      const gravity = state.collision?.surfaceAt?.(originX, originZ) === 'low-gravity'
        ? state.collision.layout?.gameplay?.lowGravityMultiplier || 1
        : 1;
      const duration = (attack.flight || 0.75) / Math.sqrt(Math.max(0.05, gravity));
      player.airborneT = duration;
      player.leapState = {
        remaining: duration,
        x: player.x,
        z: player.z,
        damage: attack.damage,
        radius: attack.blast || attack.radius,
        knockback: attack.knockback || 0,
        color: attack.color,
      };
      state.events.push({ type: 'SUPER_DASH', ownerId: player.id, fromX: originX, fromZ: originZ, toX: player.x, toZ: player.z, duration, leap: true });
    } else {
      hitSegment(state, player, originX, originZ, player.x, player.z, attack.damage, attack.radius);
      state.events.push({ type: 'SUPER_DASH', ownerId: player.id, fromX: originX, fromZ: originZ, toX: player.x, toZ: player.z, duration: attack.flight || 0.22, leap: false });
    }
    return true;
  }
  if (attack.kind === 'iaido') {
    player.skillParryT = 0;
    player.parryT = attack.guardDuration;
    player.iaidoState = { targetX, targetZ };
    player.iaidoEmpowered = player.parryEmpowerT > 0;
    player.parryEmpowerT = 0;
    state.events.push({ type: 'PARRY_WINDOW', ownerId: player.id, duration: attack.guardDuration });
    return true;
  }
  if (attack.kind === 'arrow-shower') {
    const id = `area_${state.tick}_${areaSerial += 1}`;
    const radius = attack.areaRadius || attack.radius;
    const damage = attack.waveDamage || attack.damage;
    state.areaEffects.set(id, { id, ownerId: player.id, kind: attack.kind, x: targetX, z: targetZ, radius, color: attack.color, damage, remaining: attack.warningDelay + attack.waveCount * attack.waveInterval, nextT: attack.warningDelay, interval: attack.waveInterval, waves: attack.waveCount });
    state.events.push({ type: 'SUPER_ZONE', id, ownerId: player.id, x: targetX, z: targetZ, radius, color: attack.color, warning: attack.warningDelay, duration: attack.waveCount * attack.waveInterval });
    return true;
  }
  if (attack.kind === 'gojo-domain' || attack.kind === 'sukuna-zone') {
    const id = `area_${state.tick}_${areaSerial += 1}`;
    const point = clampTarget(state, player, targetX, targetZ, direction, attack.range);
    state.areaEffects.set(id, {
      id, ownerId: player.id, kind: attack.kind, x: point.x, z: point.z,
      radius: attack.radius, color: attack.color, warning: attack.warningDelay,
      remaining: attack.warningDelay + attack.duration, activeDuration: attack.duration,
      nextT: attack.warningDelay, interval: attack.waveInterval || 0,
      waves: attack.waveCount || 0, damage: attack.waveDamage || 0,
      freeze: attack.freeze || 0, breaksWalls: attack.breaksWalls === true,
      hitIds: new Set(), activated: false,
    });
    state.events.push({ type: 'SUPER_ZONE', id, ownerId: player.id, kind: attack.kind, x: point.x, z: point.z, radius: attack.radius, color: attack.color, warning: attack.warningDelay, duration: attack.duration });
    return true;
  }
  return false;
}

export function resolveIaido(state, player) {
  const attack = getCharacterDef(player.characterId).super;
  const target = player.iaidoState;
  if (!target || !player.alive) return false;
  const originX = player.x;
  const originZ = player.z;
  const direction = normalize2(target.targetX - originX, target.targetZ - originZ);
  const distance = Math.min(attack.dashRange || attack.range, Math.hypot(target.targetX - originX, target.targetZ - originZ));
  player.x += direction.x * distance;
  player.z += direction.z * distance;
  const resolved = state.collision?.resolveCircle(player.x, player.z, 0.45) || { x: player.x, z: player.z };
  player.x = resolved.x;
  player.z = resolved.z;
  hitSegment(state, player, originX, originZ, player.x, player.z, player.iaidoEmpowered ? attack.parryDamage : attack.baseDamage || attack.damage, attack.slashRadius || attack.radius);
  state.events.push({ type: 'SUPER_DASH', ownerId: player.id, fromX: originX, fromZ: originZ, toX: player.x, toZ: player.z });
  player.iaidoState = null;
  player.iaidoEmpowered = false;
  return true;
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
    kind: attack.projectile || (attack.kind === 'lob' ? 'bomb' : 'bolt'),
    color: attack.color || null,
    electric: attack.electric === true,
    range: attack.range,
    radius: attack.radius || 0.16,
    damage: attack.damage,
    returnDamage: attack.returnDamageMultiplier === undefined ? null : attack.damage * attack.returnDamageMultiplier,
    knockback: attack.knockback ?? (attack.kind === 'lob' || attack.noKnockback ? 0 : 1.2),
    noKnockback: attack.noKnockback === true,
    breaksWalls: attack.breaksWalls === true,
    travelled: 0,
    returning: attack.returning === true,
    onReturn: false,
    pierce: attack.pierce === true,
    pierceCover: attack.pierceCover === true,
    pierceCoverRemaining: attack.pierceCover === true ? (attack.pierceCoverCount ?? 1) : 0,
    defenseBreak: attack.defenseBreak || 0,
    defenseBreakDuration: attack.defenseBreakDuration || 0,
    stickyFuse: attack.stickyFuse || 0,
    stickyFuseRemaining: attack.stickyFuse || 0,
    stickyAttachToTarget: attack.stickyAttachToTarget === true,
    stickyAttachToCover: attack.stickyAttachToCover === true,
    stickyTargetId: null,
    stickyOffsetX: 0,
    stickyOffsetZ: 0,
    kunaiSkill: attack.kunaiSkill === true,
    splashRadius: attack.splashRadius || attack.blast || 0,
    burnDamage: attack.burnDamage || 0,
    burnDuration: attack.burnDuration || 0,
    lob: attack.kind === 'lob',
    flight: attack.flight || 0,
    fuse: attack.fuse || 0,
    height: 0,
    hitIds: new Set(),
    isSuper,
  };
  state.projectiles.set(projectile.id, projectile);
  state.events.push({ type: 'PROJECTILE_SPAWN', projectile: serializeProjectile(projectile) });
  return projectile;
}

function scheduleBurst(player, attack, direction, isSuper, cooldown = null) {
  const count = Math.max(1, attack.count || 1);
  const interval = attack.interval || 0.12;
  player.burstState = {
    attack: { ...attack },
    dirX: direction.x,
    dirZ: direction.z,
    remaining: count,
    timer: 0,
    isSuper,
  };
  player.attackCooldown = cooldown ?? count * interval + 0.12;
  player.burstT = Math.max(0, (count - 1) * interval + 0.12);
}

export function stepBursts(state, dt) {
  for (const player of state.players.values()) {
    const burst = player.burstState;
    if (!burst || !player.alive) {
      if (!player.alive) player.burstState = null;
      continue;
    }
    burst.timer -= dt;
    while (burst.timer <= 0 && burst.remaining > 0) {
      const attack = burst.attack;
      const direction = { x: burst.dirX, z: burst.dirZ };
      if (attack.kind === 'melee') {
        hitArc(state, player, direction, attack.range, attack.arc || Math.PI, attack.damage, attack.radius || 0.45, attack);
        if (attack.lunge) {
          player.x += direction.x * attack.lunge;
          player.z += direction.z * attack.lunge;
          const resolved = state.collision?.resolveCircle(player.x, player.z, 0.45) || { x: player.x, z: player.z };
          player.x = resolved.x; player.z = resolved.z;
        }
        state.events.push({ type: 'MELEE_SWING', ownerId: player.id, attackSerial: player.attackSerial, comboStep: attack.comboStep ?? player.comboStep ?? 0 });
      } else {
        spawnProjectile(state, player, attack, direction.x, direction.z, burst.isSuper);
      }
      burst.remaining -= 1;
      burst.timer += attack.interval || 0.12;
    }
    if (burst.remaining <= 0) player.burstState = null;
  }
}

export function stepSkillDashes(state) {
  for (const player of state.players.values()) {
    const dash = player.skillDashState;
    if (!dash) continue;
    if (!player.alive) { player.skillDashState = null; continue; }
    if (!(dash.distance > 0.08)) { player.skillDashState = null; continue; }
    if (player.hardCCT > 0 || player.airborneT > 0) continue;
    if (dash.skillId === 'iron-charge' || dash.skillId === 'swift-flash') {
      for (const target of state.players.values()) {
        if (target.id === player.id || !target.alive || target.airborneT > 0 || dash.hitIds.includes(target.id)) continue;
        if (!segmentHitsCircle(dash.previousX, dash.previousZ, player.x, player.z, target.x, target.z, 0.32 + 0.45)) continue;
        dash.hitIds.push(target.id);
        const dealt = applyDamage(state, target, dash.damage, player);
        if (dealt > 0 && !target.lastDamageBlocked && target.alive) {
          const direction = normalize2(target.x - player.x, target.z - player.z);
          if (dash.knockback > 0) displaceTarget(state, target, direction.x * dash.knockback, direction.z * dash.knockback);
          if (dash.skillId === 'iron-charge') {
            interruptCharge(state, target);
            break;
          }
          state.events.push({ type: 'SKILL_HIT', ownerId: player.id, targetId: target.id, skill: dash.skill, damage: dealt });
        }
      }
    }
    if (dash.finished) {
      if (dash.restoreAmmo > 0 && characterUsesAmmo(player.characterId)) player.ammo = Math.min(characterMaxAmmo(player.characterId), player.ammo + dash.restoreAmmo);
      state.events.push({ type: 'SKILL_DASH_END', ownerId: player.id, skill: dash.skill, skillId: dash.skillId, x: player.x, z: player.z });
      player.skillDashState = null;
    }
  }
}

export function stepSkillTraps(state, dt) {
  for (const [id, trap] of state.skillTraps) {
    trap.remaining = Math.max(0, trap.remaining - dt);
    let triggered = false;
    for (const target of state.players.values()) {
      if (target.id === trap.ownerId || !target.alive || target.airborneT > 0 || trap.hitIds.has(target.id)) continue;
      if (Math.hypot(target.x - trap.x, target.z - trap.z) > trap.radius + 0.45) continue;
      trap.hitIds.add(target.id);
      applySlowEffect(target, `caltrops:${trap.ownerId}`, trap.slow, trap.damageDuration);
      target.bleeds ||= new Map();
      target.bleeds.set(`caltrops:${trap.ownerId}`, { ownerId: trap.ownerId, damage: trap.damagePerSecond, remaining: trap.damageDuration, nextT: 1, ticksRemaining: Math.ceil(trap.damageDuration) });
      state.events.push({ type: 'SKILL_TRAP_TRIGGERED', id, ownerId: trap.ownerId, targetId: target.id, x: trap.x, z: trap.z, color: 0xd2bd83 });
      triggered = true;
      break;
    }
    if (triggered || trap.remaining <= 0) {
      state.skillTraps.delete(id);
      if (!triggered) state.events.push({ type: 'SKILL_TRAP_END', id });
    }
  }
}

export function stepProjectiles(state, dt) {
  for (const [id, projectile] of state.projectiles) {
    if (projectile.stickyFuse > 0 && projectile.stickyTargetId) {
      const stuckTarget = state.players.get(projectile.stickyTargetId);
      if (stuckTarget?.alive) {
        projectile.x = stuckTarget.x + projectile.stickyOffsetX;
        projectile.z = stuckTarget.z + projectile.stickyOffsetZ;
      } else if (projectile.stickyTargetId !== 'cover') {
        projectile.stickyTargetId = 'cover';
      }
      projectile.stickyFuseRemaining = Math.max(0, projectile.stickyFuseRemaining - dt);
      if (projectile.stickyFuseRemaining <= 0) {
        detonateSticky(state, projectile, state.players.get(projectile.ownerId));
        state.projectiles.delete(id);
        state.events.push({ type: 'PROJECTILE_DESTROY', projectileId: id, x: projectile.x, z: projectile.z, color: projectile.color });
      }
      continue;
    }
    const previousX = projectile.x; const previousZ = projectile.z;
    const distance = projectile.speed * dt;
    projectile.x += projectile.dirX * distance; projectile.z += projectile.dirZ * distance; projectile.travelled += distance;
    let removed = false;
    if (projectile.lob) {
      const arc = Math.max(0, Math.min(1, projectile.travelled / Math.max(0.001, projectile.range)));
      projectile.height = Math.sin(arc * Math.PI) * (projectile.isSuper ? 3.1 : 2.15);
    }
    const projectileRadius = Math.max(0.03, projectile.radius * 0.35);
    const blocker = !projectile.lob && (state.collision?.projectileBlocker
      ? state.collision.projectileBlocker(previousX, previousZ, projectile.x, projectile.z, projectileRadius, projectile.piercedCoverTile)
      : state.collision?.blocksSegment?.(previousX, previousZ, projectile.x, projectile.z, projectileRadius) ? { kind: 'solid' } : null);
    let hitWall = !!blocker;
    if (blocker?.kind === 'cover' && projectile.pierceCover && projectile.pierceCoverRemaining > 0) {
      projectile.piercedCoverTile = { x: blocker.tileX, z: blocker.tileZ };
      projectile.pierceCoverRemaining -= 1;
      hitWall = false;
    }
    if (hitWall) {
      if (projectile.stickyFuse > 0 && projectile.stickyAttachToCover) {
        projectile.stickyTargetId = 'cover';
        projectile.stickyFuseRemaining = projectile.stickyFuse;
        state.events.push({ type: 'SKILL_STICKY_ATTACH', projectileId: id, ownerId: projectile.ownerId, x: projectile.x, z: projectile.z, fuse: projectile.stickyFuse, color: projectile.color });
        continue;
      }
      if (projectile.splashRadius > 0) {
        const owner = state.players.get(projectile.ownerId);
        if (projectile.burnDamage > 0) detonateSukunaFlame(state, projectile, owner, projectile.x, projectile.z);
        else {
          hitRadius(state, owner, projectile.x, projectile.z, projectile.splashRadius, projectile.damage, projectile.knockback || 0, { directionX: projectile.dirX, directionZ: projectile.dirZ, projectile: true });
          state.events.push({ type: 'EXPLOSION', ownerId: projectile.ownerId, x: projectile.x, z: projectile.z, radius: projectile.splashRadius, color: projectile.color, super: projectile.isSuper });
        }
      }
      removed = true;
    }
    if (removed) {
      state.projectiles.delete(id);
      state.events.push({ type: 'PROJECTILE_DESTROY', projectileId: id, x: projectile.x, z: projectile.z, electric: projectile.electric, color: projectile.color });
      continue;
    }
    if (projectile.onReturn) {
      const owner = state.players.get(projectile.ownerId);
      if (owner && Math.hypot(projectile.x - owner.x, projectile.z - owner.z) <= projectile.radius + 0.35) removed = true;
      if (projectile.travelled >= projectile.range) removed = true;
    } else if (projectile.travelled >= projectile.range) {
      if (projectile.stickyFuse > 0 && projectile.stickyAttachToCover) {
        projectile.stickyTargetId = 'cover';
        projectile.stickyFuseRemaining = projectile.stickyFuse;
        state.events.push({ type: 'SKILL_STICKY_ATTACH', projectileId: id, ownerId: projectile.ownerId, x: projectile.x, z: projectile.z, fuse: projectile.stickyFuse, color: projectile.color });
        continue;
      }
      if (projectile.returning) {
        const owner = state.players.get(projectile.ownerId);
        if (owner) {
          const direction = normalize2(owner.x - projectile.x, owner.z - projectile.z);
          projectile.dirX = direction.x; projectile.dirZ = direction.z; projectile.onReturn = true; projectile.travelled = 0; projectile.hitIds.clear();
          if (projectile.returnDamage !== null) projectile.damage = projectile.returnDamage;
          state.events.push({ type: 'PROJECTILE_RETURN', projectileId: projectile.id });
        } else removed = true;
      } else {
        if (projectile.splashRadius > 0) {
          const owner = state.players.get(projectile.ownerId);
          if (projectile.burnDamage > 0) detonateSukunaFlame(state, projectile, owner, projectile.x, projectile.z);
          else {
            hitRadius(state, owner, projectile.x, projectile.z, projectile.splashRadius, projectile.damage, projectile.knockback || 0, { directionX: projectile.dirX, directionZ: projectile.dirZ, projectile: true });
            state.events.push({ type: 'EXPLOSION', ownerId: projectile.ownerId, x: projectile.x, z: projectile.z, radius: projectile.splashRadius, color: projectile.color, super: projectile.isSuper });
          }
        }
        removed = true;
      }
    }
    for (const target of state.players.values()) {
      if (target.id === projectile.ownerId || !target.alive || target.airborneT > 0 || projectile.hitIds.has(target.id)) continue;
      if (!segmentHitsCircle(previousX, previousZ, projectile.x, projectile.z, target.x, target.z, projectile.radius + 0.45)) continue;
      projectile.hitIds.add(target.id);
      if (target.characterId === 'ello' && target.parryT > 0 && !projectile.isSuper) {
        const faceX = Math.sin(target.facing);
        const faceZ = Math.cos(target.facing);
        const incoming = projectile.dirX * faceX + projectile.dirZ * faceZ;
        if (incoming < -0.25) {
          target.parryT = 0;
          target.iaidoEmpowered = true;
          state.events.push({ type: 'PARRY', ownerId: target.id, projectileId: projectile.id });
          removed = true;
          break;
        }
      }
      if (projectile.stickyFuse > 0 && projectile.stickyAttachToTarget) {
        projectile.stickyTargetId = target.id;
        projectile.stickyOffsetX = projectile.x - target.x;
        projectile.stickyOffsetZ = projectile.z - target.z;
        projectile.stickyFuseRemaining = projectile.stickyFuse;
        state.events.push({ type: 'SKILL_STICKY_ATTACH', projectileId: id, ownerId: projectile.ownerId, targetId: target.id, x: projectile.x, z: projectile.z, fuse: projectile.stickyFuse, color: projectile.color });
        break;
      }
      let dealt = 0;
      if (projectile.splashRadius > 0) {
        const owner = state.players.get(projectile.ownerId);
        if (projectile.burnDamage > 0) detonateSukunaFlame(state, projectile, owner, projectile.x, projectile.z);
        else {
          hitRadius(state, owner, projectile.x, projectile.z, projectile.splashRadius, projectile.damage, projectile.knockback || 0, { directionX: projectile.dirX, directionZ: projectile.dirZ, projectile: true });
          state.events.push({ type: 'EXPLOSION', ownerId: projectile.ownerId, x: projectile.x, z: projectile.z, radius: projectile.splashRadius, color: projectile.color, super: projectile.isSuper });
        }
        if (projectile.burnDamage > 0) removed = true;
      } else {
        dealt = applyDamage(state, target, projectile.damage, state.players.get(projectile.ownerId), { directionX: projectile.dirX, directionZ: projectile.dirZ, projectile: true });
        if (dealt > 0 && !projectile.noKnockback && !isKnockbackImmune(target)) {
          const strength = projectile.knockback || 0;
          target.x += projectile.dirX * strength;
          target.z += projectile.dirZ * strength;
          const resolved = state.collision?.resolveCircle(target.x, target.z, 0.45) || { x: target.x, z: target.z };
          target.x = resolved.x; target.z = resolved.z;
        }
      }
      const owner = state.players.get(projectile.ownerId);
      if (projectile.kunaiSkill && dealt > 0 && owner) {
        owner.kunaiRecastTargetId = target.id;
        owner.kunaiRecastUntil = state.match.elapsed + (getCharacterDef('naka').skills[1].recastWindow || 2);
        state.events.push({ type: 'KUNAI_RECAST_READY', ownerId: owner.id, targetId: target.id, remaining: getCharacterDef('naka').skills[1].recastWindow || 2 });
      }
      if (projectile.defenseBreak > 0 && dealt > 0) {
        target.defenseBreakT = Math.max(target.defenseBreakT || 0, projectile.defenseBreakDuration);
        state.events.push({ type: 'DEFENSE_BROKEN', targetId: target.id, sourceId: projectile.ownerId, remaining: target.defenseBreakT });
      }
      if (owner?.characterId === 'naka' && projectile.returning && projectile.onReturn) owner.speedBoostT = 1.5;
      if (!projectile.returning && !projectile.pierce && (projectile.splashRadius === 0 || projectile.burnDamage > 0)) removed = true;
    }
    if (removed) { state.projectiles.delete(id); state.events.push({ type: 'PROJECTILE_DESTROY', projectileId: id, x: projectile.x, z: projectile.z, electric: projectile.electric, color: projectile.color }); }
  }
}

export function stepAreaEffects(state, dt) {
  for (const player of state.players.values()) player.smokeConcealed = false;
  for (const [id, area] of state.areaEffects) {
    if (area.kind === 'gojo-pull') {
      area.remaining -= dt;
      for (const target of state.players.values()) {
        if (!target.alive || target.airborneT > 0 || target.id === area.ownerId || Math.hypot(target.x - area.x, target.z - area.z) > area.radius + 0.45) continue;
        if (!area.hitIds.has(target.id)) {
          area.hitIds.add(target.id);
          const dealt = applyDamage(state, target, area.damage, state.players.get(area.ownerId));
          if (dealt <= 0 || target.lastDamageBlocked || !target.alive) {
            area.blockedIds.add(target.id);
            continue;
          }
          applySlowEffect(target, `gojo:${area.ownerId}`, area.slow, area.remaining);
        }
        if (area.blockedIds.has(target.id) || target.hardCCT > 0) continue;
        const delta = normalize2(area.x - target.x, area.z - target.z);
        const distance = Math.hypot(area.x - target.x, area.z - target.z);
        if (distance <= 0.08) continue;
        const amount = Math.min(distance, area.pullSpeed * dt);
        const next = state.collision?.resolveCircle?.(target.x + delta.x * amount, target.z + delta.z * amount, 0.45) || { x: target.x + delta.x * amount, z: target.z + delta.z * amount };
        target.x = next.x; target.z = next.z;
      }
      if (area.remaining <= 0) {
        for (const target of state.players.values()) target.slowEffects?.delete(`gojo:${area.ownerId}`);
        state.areaEffects.delete(id); state.events.push({ type: 'AREA_END', id });
      }
      continue;
    }

    if (area.kind === 'smoke-screen') {
      area.remaining -= dt;
      const owner = state.players.get(area.ownerId);
      if (owner?.alive && Math.hypot(owner.x - area.x, owner.z - area.z) <= area.radius && owner.smokeRevealT <= 0) owner.smokeConcealed = true;
      for (const target of state.players.values()) {
        if (target.id === area.ownerId || !target.alive || target.airborneT > 0 || Math.hypot(target.x - area.x, target.z - area.z) > area.radius + 0.45) continue;
        applySlowEffect(target, `smoke:${id}`, area.slow, 0.35);
      }
      if (area.remaining <= 0) {
        for (const target of state.players.values()) target.slowEffects?.delete(`smoke:${id}`);
        state.areaEffects.delete(id);
        state.events.push({ type: 'AREA_END', id });
      }
      continue;
    }

    if (area.kind === 'gojo-domain' || area.kind === 'sukuna-zone') {
      area.remaining -= dt;
      area.nextT -= dt;
      if (!area.activated && area.nextT <= 0) {
        area.activated = true;
        area.remaining = area.activeDuration;
        area.warning = 0;
        area.nextT = area.kind === 'gojo-domain' ? area.activeDuration : 0;
        if (area.kind === 'gojo-domain') {
          for (const target of state.players.values()) {
            if (!target.alive || target.airborneT > 0 || target.spawnProtectionT > 0 || target.flickerInvulnT > 0 || target.id === area.ownerId || Math.hypot(target.x - area.x, target.z - area.z) > area.radius + 0.45) continue;
            applyHardCC(state, target, area.freeze, 'freeze', state.players.get(area.ownerId));
          }
          state.events.push({ type: 'DOMAIN_ACTIVATED', id, ownerId: area.ownerId, x: area.x, z: area.z, radius: area.radius, duration: area.activeDuration, color: area.color });
        } else {
          // The first slice opens destructible cover before the damage zone begins.
          destroyCoverInRadius(state, area.x, area.z, area.radius);
          while (area.nextT <= 0 && area.waves > 0) {
            hitRadius(state, state.players.get(area.ownerId), area.x, area.z, area.radius, area.damage);
            area.waves -= 1;
            area.nextT += area.interval;
            state.events.push({ type: 'SUPER_WAVE', id, ownerId: area.ownerId, kind: area.kind, x: area.x, z: area.z, radius: area.radius, color: area.color });
          }
        }
      } else if (area.activated && area.kind === 'sukuna-zone') {
        while (area.nextT <= 0 && area.waves > 0) {
          hitRadius(state, state.players.get(area.ownerId), area.x, area.z, area.radius, area.damage);
          area.waves -= 1;
          area.nextT += area.interval;
          state.events.push({ type: 'SUPER_WAVE', id, ownerId: area.ownerId, kind: area.kind, x: area.x, z: area.z, radius: area.radius, color: area.color });
        }
      }
      if (area.remaining <= 0 || (area.kind === 'sukuna-zone' && area.waves <= 0)) {
        state.areaEffects.delete(id); state.events.push({ type: 'AREA_END', id });
      }
      continue;
    }

    area.remaining -= dt; area.nextT -= dt;
    while (area.nextT <= 0 && area.waves > 0) {
      hitRadius(state, state.players.get(area.ownerId), area.x, area.z, area.radius, area.damage);
      area.waves -= 1; area.nextT += area.interval;
      state.events.push({ type: 'SUPER_WAVE', id, ownerId: area.ownerId, x: area.x, z: area.z, radius: area.radius, color: area.color });
    }
    if (area.remaining <= 0 || area.waves <= 0) { state.areaEffects.delete(id); state.events.push({ type: 'AREA_END', id }); }
  }
}

export function stepCharacterEffects(state, dt) {
  for (const player of state.players.values()) {
    if (player.characterId === 'gojo' && player.alive && !player.gojoBarrier && state.match.elapsed >= player.gojoBarrierReadyAt) {
      player.gojoBarrier = true;
      state.events.push({ type: 'BARRIER_READY', ownerId: player.id });
    }
    player.sukunaRushT = Math.max(0, (player.sukunaRushT || 0) - dt);
    player.overchargeT = Math.max(0, (player.overchargeT || 0) - dt);
    player.damageReductionT = Math.max(0, (player.damageReductionT || 0) - dt);
    player.ccImmuneT = Math.max(0, (player.ccImmuneT || 0) - dt);
    player.defenseBreakT = Math.max(0, (player.defenseBreakT || 0) - dt);
    player.stealthT = Math.max(0, (player.stealthT || 0) - dt);
    player.smokeRevealT = Math.max(0, (player.smokeRevealT || 0) - dt);
    const eagleEyeWasActive = player.eagleEyeT > 0;
    player.eagleEyeT = Math.max(0, (player.eagleEyeT || 0) - dt);
    if (eagleEyeWasActive && player.eagleEyeT === 0) player.pierceCoverShots = 0;
    player.skillParryT = Math.max(0, (player.skillParryT || 0) - dt);
    player.parryEmpowerT = Math.max(0, (player.parryEmpowerT || 0) - dt);
    player.tauntEchoT = Math.max(0, (player.tauntEchoT || 0) - dt);
    if (player.tauntEchoT > 0) {
      for (const target of state.players.values()) {
        if (target.id === player.id || !target.alive || target.airborneT > 0 || Math.hypot(target.x - player.x, target.z - player.z) > player.tauntEchoRadius + 0.45) continue;
        const away = normalize2(target.x - player.x, target.z - player.z);
        const move = normalize2(target.input?.moveX || 0, target.input?.moveZ || 0);
        if (away.x * move.x + away.z * move.z > 0.35) applySlowEffect(target, `taunt:${player.id}`, player.tauntEchoSlow, 0.28);
      }
    }
    for (const [sourceId, slow] of player.slowEffects || []) {
      slow.remaining = Math.max(0, slow.remaining - dt);
      if (slow.remaining <= 0) player.slowEffects.delete(sourceId);
    }
    if (!player.alive) continue;
    for (const [sourceId, effect] of player.bleeds || []) {
      effect.remaining -= dt; effect.nextT -= dt;
      while (effect.nextT <= 0 && effect.ticksRemaining > 0 && player.alive) {
        effect.nextT += 1;
        effect.ticksRemaining -= 1;
        applyDamage(state, player, effect.damage, state.players.get(effect.ownerId ?? sourceId), { dot: true });
      }
      if (effect.remaining <= 0 || effect.ticksRemaining <= 0) player.bleeds.delete(sourceId);
    }
    for (const [sourceId, effect] of player.burns || []) {
      effect.remaining -= dt; effect.nextT -= dt;
      while (effect.nextT <= 0 && effect.ticksRemaining > 0 && player.alive) {
        effect.nextT += 1;
        effect.ticksRemaining -= 1;
        applyDamage(state, player, effect.damage, state.players.get(effect.ownerId ?? sourceId), { dot: true });
      }
      if (effect.remaining <= 0 || effect.ticksRemaining <= 0) player.burns.delete(sourceId);
    }
    for (const [targetId, hit] of player.sukunaBasicHits || []) {
      if (state.match.elapsed - hit.lastAt > 1.5) player.sukunaBasicHits.delete(targetId);
    }
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
      if (!player.alive || player.airborneT > 0 || Math.hypot(player.x - item.x, player.z - item.z) > 0.85) continue;
      player.heldItems ||= [player.heldItem || null, null];
      const slot = player.heldItems.findIndex((held) => !held);
      if (slot < 0) continue;
      player.heldItems[slot] = item.kind;
      player.heldItem = player.heldItems[0] || null;
      item.active = false; item.respawnT = 10;
      state.events.push({ type: 'ITEM_PICKUP', itemId: item.id, ownerId: player.id, kind: item.kind, slot });
      break;
    }
  }
}

function hitArc(state, attacker, direction, range, arc, damage, radius, attack = {}) {
  const cosArc = Math.cos(arc / 2);
  for (const target of state.players.values()) {
    if (target.id === attacker.id || !target.alive || target.airborneT > 0) continue;
    const dx = target.x - attacker.x; const dz = target.z - attacker.z; const distance = Math.hypot(dx, dz);
    const dot = distance > 1e-8 ? (dx * direction.x + dz * direction.z) / distance : 1;
    if (distance <= range + radius && dot >= cosArc && !state.collision?.blocksSegment?.(attacker.x, attacker.z, target.x, target.z, 0.08)) {
      const dealt = applyDamage(state, target, damage, attacker);
      if (dealt > 0 && !target.lastDamageBlocked && !isKnockbackImmune(target)) {
        if (attacker.characterId === 'sukuna' && attack.sukunaBasic) recordSukunaBasicHit(state, attacker, target);
        const knockback = attacker.characterId === 'ello' ? (getCharacterDef(attacker.characterId).attack.knockback || 0) : 0;
        const push = attack.push || knockback;
        const pull = attack.pull || 0;
        if (push > 0) displaceTarget(state, target, (dx / Math.max(distance, 1e-8)) * push, (dz / Math.max(distance, 1e-8)) * push);
        else if (pull > 0) displaceTarget(state, target, -(dx / Math.max(distance, 1e-8)) * pull, -(dz / Math.max(distance, 1e-8)) * pull);
      }
    }
  }
}

function hitSegment(state, attacker, ax, az, bx, bz, damage, radius = 0.65) {
  for (const target of state.players.values()) {
    if (target.id === attacker.id || !target.alive || target.airborneT > 0) continue;
    if (segmentHitsCircle(ax, az, bx, bz, target.x, target.z, radius + 0.45) && !state.collision?.blocksSegment?.(ax, az, target.x, target.z, 0.08)) {
      const dealt = applyDamage(state, target, damage, attacker);
      const knockback = getCharacterDef(attacker.characterId).super.knockback || 0;
      if (dealt > 0 && knockback > 0 && !isKnockbackImmune(target)) {
        const direction = normalize2(target.x - attacker.x, target.z - attacker.z);
        target.x += direction.x * knockback;
        target.z += direction.z * knockback;
      }
    }
  }
}

function hitRadius(state, attacker, x, z, radius, damage, knockback = 0, options = {}) {
  if (!attacker) return;
  for (const target of state.players.values()) {
    if (target.id === attacker.id || !target.alive || target.airborneT > 0 || Math.hypot(target.x - x, target.z - z) > radius) continue;
    const dealt = applyDamage(state, target, damage, attacker, options);
    if (dealt > 0 && knockback > 0 && !isKnockbackImmune(target)) {
      const direction = normalize2(target.x - x, target.z - z);
      target.x += direction.x * knockback; target.z += direction.z * knockback;
    }
  }
}

export function applyDamage(state, target, amount, attacker, options = {}) {
  if (target) target.lastDamageBlocked = false;
  if (!target?.alive || target.spawnProtectionT > 0 || target.flickerInvulnT > 0 || target.airborneT > 0) return 0;
  if (consumeGojoBarrier(state, target, attacker)) return 0;
  if (consumeSkillParry(state, target, attacker, options)) { target.lastDamageBlocked = true; return 0; }
  if (!options.dot && target.stealthT > 0) {
    target.stealthT = 0;
    state.events.push({ type: 'STEALTH_END', ownerId: target.id });
  }
  if (target.characterId === 'gojo') target.gojoBarrierReadyAt = state.match.elapsed + 5;
  let multiplier = target.shieldT > 0 ? 0.35 : 1;
  if (target.damageReductionT > 0) multiplier *= 1 - Math.max(0, Math.min(0.9, target.damageReduction || 0));
  if (target.defenseBreakT > 0) multiplier *= 1.12;
  const dealt = Math.min(target.hp, Math.max(0, Math.round(amount * multiplier)));
  target.hp -= dealt;
  target.lastCombat = state.match.elapsed;
  if (attacker) attacker.lastCombat = state.match.elapsed;
  if (attacker?.characterId === 'fuse') target.slowT = Math.max(target.slowT || 0, 1);
  if (attacker && attacker.id !== target.id) {
    const attackerDef = getCharacterDef(attacker.characterId);
    attacker.superCharge = Math.min(1, attacker.superCharge + dealt * 0.75 / Math.max(1, attackerDef.superCharge));
    if (target.characterId === 'titan') {
      const targetDef = getCharacterDef(target.characterId);
      target.superCharge = Math.min(1, target.superCharge + dealt * 0.35 * 0.75 / Math.max(1, targetDef.superCharge));
    }
  }
  state.events.push({ type: 'DAMAGE', targetId: target.id, attackerId: attacker?.id || null, amount: dealt });
  if (target.hp > 0) return dealt;
  target.hp = 0; target.alive = false; target.deaths += 1; target.deadT = 0;
  if (attacker && attacker.id !== target.id) attacker.kills += 1;
  state.events.push({ type: 'DEATH', targetId: target.id, attackerId: attacker?.id || null, kills: attacker?.kills || 0 });
  if (attacker?.characterId === 'sukuna' && state.match.elapsed >= (attacker.sukunaPassiveReadyAt || 0)) {
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(attacker.maxHp * 0.15));
    attacker.sukunaRushT = 2;
    attacker.sukunaPassiveReadyAt = state.match.elapsed + 4;
    state.events.push({ type: 'SUKUNA_PASSIVE', ownerId: attacker.id, healed: attacker.hp - before, speedDuration: 2 });
  }
  return dealt;
}

function consumeGojoBarrier(state, target, attacker) {
  if (!attacker || attacker.id === target.id || target.characterId !== 'gojo' || !target.gojoBarrier) return false;
  target.gojoBarrier = false;
  target.gojoBarrierReadyAt = state.match.elapsed + 5;
  target.lastDamageBlocked = true;
  state.events.push({ type: 'BARRIER_BLOCKED', targetId: target.id, attackerId: attacker.id });
  return true;
}

export function stepLeaps(state, dt) {
  for (const player of state.players.values()) {
    const leap = player.leapState;
    if (!leap || !player.alive) {
      if (!player.alive) {
        player.leapState = null;
        player.airborneT = 0;
      }
      continue;
    }
    leap.remaining = Math.max(0, leap.remaining - dt);
    player.airborneT = leap.remaining;
    if (leap.remaining > 0) continue;
    player.leapState = null;
    player.airborneT = 0;
    hitRadius(state, player, leap.x, leap.z, leap.radius, leap.damage, leap.knockback);
    state.events.push({ type: 'EXPLOSION', ownerId: player.id, x: leap.x, z: leap.z, radius: leap.radius, color: leap.color, super: true });
  }
}

function detonateSticky(state, projectile, owner) {
  if (!owner) return;
  hitRadius(state, owner, projectile.x, projectile.z, projectile.splashRadius, projectile.damage, projectile.knockback || 0, { directionX: projectile.dirX, directionZ: projectile.dirZ, projectile: true });
  destroyCoverInRadius(state, projectile.x, projectile.z, projectile.splashRadius);
  state.events.push({ type: 'EXPLOSION', ownerId: owner.id, x: projectile.x, z: projectile.z, radius: projectile.splashRadius, color: projectile.color, skillId: 'sticky-grenade' });
}

function isKnockbackImmune(player) {
  return player?.characterId === 'ello' && (player.parryT > 0 || player.iaidoState || player.burstState);
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
