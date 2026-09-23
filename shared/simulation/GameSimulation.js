import { SeededRng } from '../utils/rng.js';
import { MapCollision } from '../maps/MapCollision.js';
import { characterMaxAmmo, characterUsesAmmo, getCharacterDef } from '../data/characters.js';
import { createSimulationState } from './SimulationState.js';
import { stepMovement } from './MovementSystem.js';
import { beginAttack, releaseAttack, resolveIaido, stepAreaEffects, stepBursts, stepItems, stepProjectiles, useFlicker, useItem, useSuper, applyDamage } from './CombatSystem.js';

export class GameSimulation {
  constructor(options = {}) {
    this.state = createSimulationState(options);
    this.rng = new SeededRng(this.state.match.matchSeed);
    this.collision = options.collision || new MapCollision();
    this.state.collision = this.collision;
    this.events = [];
  }

  stepWeaponState(dt) {
    for (const player of this.state.players.values()) {
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      if (player.comboResetT > 0) {
        player.comboResetT = Math.max(0, player.comboResetT - dt);
        if (player.comboResetT === 0) player.comboStep = 0;
      }
      const character = getCharacterDef(player.characterId);
      const maxAmmo = characterMaxAmmo(player.characterId);
      if (characterUsesAmmo(player.characterId) && player.ammo < maxAmmo) {
        player.reloadT += dt / Math.max(0.01, character.reload || 1);
        if (player.reloadT >= 1) {
          player.reloadT = 0;
          player.ammo = Math.min(maxAmmo, player.ammo + 1);
        }
      } else {
        player.reloadT = 0;
      }
    }
  }

  setInput(playerId, input) {
    const player = this.state.players.get(playerId);
    if (!player) return false;
    const seq = Number.isInteger(input.seq) ? input.seq : player.lastReceivedInputSeq + 1;
    if (seq <= player.lastReceivedInputSeq) return true;
    const normalized = {
      ...player.input,
      ...input,
      seq,
      moveX: Number.isFinite(input.moveX) ? Math.max(-1, Math.min(1, input.moveX)) : 0,
      moveZ: Number.isFinite(input.moveZ) ? Math.max(-1, Math.min(1, input.moveZ)) : 0,
      aimX: Number.isFinite(input.aimX) ? Math.max(-1, Math.min(1, input.aimX)) : player.input.aimX,
      aimZ: Number.isFinite(input.aimZ) ? Math.max(-1, Math.min(1, input.aimZ)) : player.input.aimZ,
    };
    player.lastReceivedInputSeq = seq;
    // Keep the latest received intent available to diagnostics and bot logic;
    // movement itself still consumes the queued value at the simulation tick.
    player.input = normalized;
    player.pendingInputs.push(normalized);
    if (player.pendingInputs.length > 120) player.pendingInputs.splice(0, player.pendingInputs.length - 120);
    return true;
  }

  removePlayer(playerId) {
    return this.state.players.delete(playerId);
  }

  attackStart(playerId, aimX, aimZ) {
    return beginAttack(this.state, playerId, aimX, aimZ);
  }

  attackRelease(playerId, aimX, aimZ) {
    return releaseAttack(this.state, playerId, aimX, aimZ);
  }

  super(playerId, payload) {
    return useSuper(this.state, playerId, payload);
  }

  item(playerId) {
    return useItem(this.state, playerId);
  }

  flicker(playerId, payload) {
    return useFlicker(this.state, playerId, payload);
  }

  tick(dt) {
    if (this.state.match.status !== 'running') return [];
    const queuedEvents = this.state.events;
    this.state.events = [];
    this.state.tick += 1;
    this.state.match.elapsed += dt;
    this.state.match.remaining = Math.max(0, this.state.match.remaining - dt);
    this.events = queuedEvents;
    this.stepWeaponState(dt);
    for (const player of this.state.players.values()) {
      player.deadT += player.alive ? 0 : dt;
      const wasParrying = player.parryT > 0;
      player.parryT = Math.max(0, (player.parryT || 0) - dt);
      player.flickerInvulnT = Math.max(0, (player.flickerInvulnT || 0) - dt);
      if (player.parryT === 0 && player.iaidoState && player.alive && (wasParrying || player.iaidoEmpowered)) resolveIaido(this.state, player);
      if (player.alive && player.hp < player.maxHp && this.state.match.elapsed - player.lastCombat > 3) {
        player.regenT += dt;
        if (player.regenT >= 1) {
          player.regenT = 0;
          player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.13));
        }
      } else {
        player.regenT = 0;
      }
    }
    stepBursts(this.state, dt);
    for (const player of this.state.players.values()) {
      const nextInput = player.pendingInputs.shift();
      if (nextInput) player.input = nextInput;
    }
    stepMovement(this.state, dt, this.collision);
    stepProjectiles(this.state, dt);
    stepAreaEffects(this.state, dt);
    stepItems(this.state, dt);
    this.applyHazards(dt);
    this.respawnPlayers();
    this.checkMatchEnd();
    this.events.push(...this.state.events);
    this.state.events = [];
    return this.events;
  }

  applyHazards(dt) {
    const { match } = this.state;
    let radius = null;
    if (match.gas) {
      const delay = match.mode === 'blitz' ? 10 : 26;
      const duration = match.mode === 'blitz' ? 78 : 140;
      if (match.elapsed > delay) radius = Math.max(4, 24 - ((match.elapsed - delay) / duration) * 20);
      this.state.hazards.set('gas', { kind: 'gas', radius: radius || 24, active: radius !== null });
      if (match.elapsed >= delay) {
        match.gasTickT += dt;
        while (match.gasTickT >= 1) {
          match.gasTickT -= 1;
          match.gasTicks += 1;
          const damage = 600 + Math.min(match.gasTicks, 60) * 25;
          for (const player of this.state.players.values()) {
            if (player.alive && radius !== null && Math.hypot(player.x, player.z) > radius) applyDamage(this.state, player, damage, null);
          }
        }
      }
    }
    for (const player of this.state.players.values()) {
      if (!player.alive) continue;
      const terrainHazard = this.collision.hazardAt?.(player.x, player.z);
      if (terrainHazard === 'lava') applyDamage(this.state, player, 900 * dt, null);
      else if (terrainHazard === 'toxic') applyDamage(this.state, player, 260 * dt, null);
    }
  }

  respawnPlayers() {
    if (!this.state.match.respawn) return;
    for (const player of this.state.players.values()) {
      if (player.alive || player.deadT < this.state.match.respawnDelay) continue;
      const point = this.state.spawnPoints[this.state.nextSpawnIndex % this.state.spawnPoints.length];
      this.state.nextSpawnIndex += 1;
      player.x = point.x; player.z = point.z; player.hp = player.maxHp; player.alive = true;
      player.spawnProtectionT = this.state.match.spawnProtection; player.deadT = 0; player.heldItem = null; player.shieldT = 0; player.speedBoostT = 0; player.itemSpeedT = 0; player.slowT = 0;
      player.superCharge = 0; player.ammo = characterMaxAmmo(player.characterId); player.reloadT = 0; player.attackCooldown = 0; player.burstT = 0; player.burstState = null; player.comboStep = 0; player.comboResetT = 0; player.iaidoState = null; player.iaidoEmpowered = false; player.flickerInvulnT = 0; player.flickerState = null;
      player.velX = 0; player.velZ = 0; player.input.moveX = 0; player.input.moveZ = 0; player.lastCombat = this.state.match.elapsed;
      player.chargeStartedAt = null;
      this.state.events.push({ type: 'RESPAWN', playerId: player.id, x: player.x, z: player.z });
    }
  }

  checkMatchEnd() {
    const { match, players } = this.state;
    if (match.status !== 'running') return;
    const active = [...players.values()].filter((player) => player.connected !== false);
    const alive = active.filter((player) => player.alive);
    let winner = null; let reason = null;
    if (match.mode === 'deathmatch' && match.targetKills > 0) {
      winner = active.find((player) => player.kills >= match.targetKills) || null;
      if (winner) reason = 'score';
    } else if ((match.mode === 'classic' || match.mode === 'blitz') && active.length >= 2 && alive.length <= 1 && match.elapsed > 3) {
      winner = alive[0] || [...active].sort((a, b) => b.kills - a.kills)[0] || null;
      reason = 'last-standing';
    }
    if (!reason && match.remaining <= 0) {
      winner = [...active].sort((a, b) => (b.kills - a.kills) || (Number(b.alive) - Number(a.alive)))[0] || null;
      reason = 'timer';
    }
    if (!reason) return;
    match.status = 'ended'; match.winnerId = winner?.id || null; match.endReason = reason;
    this.state.events.push({ type: 'MATCH_END', reason, winnerId: match.winnerId, scores: active.map((player) => ({ id: player.id, kills: player.kills, deaths: player.deaths })) });
  }
}
