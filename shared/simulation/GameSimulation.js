import { SeededRng } from '../utils/rng.js';
import { MapCollision } from '../maps/MapCollision.js';
import { getMapDefinition } from '../maps/MapDefinitions.js';
import { createSimulationState } from './SimulationState.js';
import { stepMovement } from './MovementSystem.js';
import { beginAttack, releaseAttack, stepAreaEffects, stepItems, stepProjectiles, useItem, useSuper, applyDamage } from './CombatSystem.js';

export class GameSimulation {
  constructor(options = {}) {
    this.state = createSimulationState(options);
    this.rng = new SeededRng(this.state.match.matchSeed);
    this.collision = options.collision || new MapCollision();
    this.state.collision = this.collision;
    this.events = [];
  }

  setInput(playerId, input) {
    const player = this.state.players.get(playerId);
    if (!player) return false;
    player.input = {
      ...player.input,
      ...input,
      moveX: Number.isFinite(input.moveX) ? Math.max(-1, Math.min(1, input.moveX)) : 0,
      moveZ: Number.isFinite(input.moveZ) ? Math.max(-1, Math.min(1, input.moveZ)) : 0,
      aimX: Number.isFinite(input.aimX) ? Math.max(-1, Math.min(1, input.aimX)) : player.input.aimX,
      aimZ: Number.isFinite(input.aimZ) ? Math.max(-1, Math.min(1, input.aimZ)) : player.input.aimZ,
    };
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

  tick(dt) {
    if (this.state.match.status !== 'running') return [];
    const queuedEvents = this.state.events;
    this.state.events = [];
    this.state.tick += 1;
    this.state.match.elapsed += dt;
    this.state.match.remaining = Math.max(0, this.state.match.remaining - dt);
    this.events = queuedEvents;
    for (const player of this.state.players.values()) {
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.deadT += player.alive ? 0 : dt;
      player.parryT = Math.max(0, (player.parryT || 0) - dt);
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
      this.state.hazards.set('gas', { kind: 'gas', radius: radius || 24 });
    }
    for (const player of this.state.players.values()) {
      if (!player.alive) continue;
      if (radius !== null && Math.hypot(player.x, player.z) > radius) applyDamage(this.state, player, (match.mode === 'blitz' ? 220 : 150) * dt, null);
      const hazard = getMapDefinition(this.state.match.mapId).hazard;
      if (hazard === 'lava' && (Math.abs(player.x) < 1.7 || Math.abs(player.z) < 1.7)) {
        applyDamage(this.state, player, 180 * dt, null);
      } else if (hazard === 'toxic' && (Math.abs(player.x) < 2.4 || Math.abs(player.z) < 2.4)) {
        applyDamage(this.state, player, 90 * dt, null);
      } else if (this.state.match.mapId.includes('lava') || this.state.match.mapId.includes('molten') || this.state.match.mapId.includes('blackstone')) {
        if (Math.abs(player.x) < 1.7 || Math.abs(player.z) < 1.7) applyDamage(this.state, player, 180 * dt, null);
      }
    }
  }

  respawnPlayers() {
    if (!this.state.match.respawn) return;
    for (const player of this.state.players.values()) {
      if (player.alive || player.deadT < this.state.match.respawnDelay) continue;
      const point = this.state.spawnPoints[this.state.nextSpawnIndex % this.state.spawnPoints.length];
      this.state.nextSpawnIndex += 1;
      player.x = point.x; player.z = point.z; player.hp = player.maxHp; player.alive = true;
      player.spawnProtectionT = 1; player.deadT = 0; player.heldItem = null; player.shieldT = 0; player.speedBoostT = 0; player.slowT = 0;
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
