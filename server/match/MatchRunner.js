import { randomInt } from 'node:crypto';
import { SERVER_EVENTS } from '../../shared/protocol/events.js';
import { PROTOCOL_VERSION } from '../../shared/protocol/version.js';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';
import { buildMapSpawnPoints, createMapCollision } from '../../shared/maps/MapDefinitions.js';
import { buildSnapshot } from './SnapshotBuilder.js';
import { BotSystem } from './BotSystem.js';

export class MatchRunner {
  constructor({ room, transport, config, logger = console }) {
    this.room = room;
    this.transport = transport;
    this.config = config;
    this.logger = logger;
    this.snapshotEvery = Math.max(1, Math.round(config.tickRate / config.snapshotRate));
    this.snapshotCounter = 0;
    this.timer = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.ended = false;
    this.stepMs = 1000 / config.tickRate;
    this.initPayload = null;
    const mapSeed = randomInt(0, 0x7fffffff);
    const matchSeed = randomInt(0, 0x7fffffff);
    const collision = createMapCollision(room.settings.mapId, mapSeed);
    const spawnPoints = buildMapSpawnPoints(room.settings.mapId, mapSeed, Math.max(8, room.players.size + (config.serverBots || 0)));
    this.simulation = new GameSimulation({
      mode: room.settings.mode,
      mapId: room.settings.mapId,
      mapSeed,
      matchSeed,
      collision,
      spawnPoints,
      players: [...room.players.values()].map((player, index, all) => {
        const point = spawnPoints[index % spawnPoints.length];
        return { ...player, x: point.x, z: point.z };
      }),
    });
    this.bots = new BotSystem(this.simulation, { count: Math.min(config.serverBots || 0, Math.max(0, 8 - room.players.size)) });
  }

  start() {
    this.room.status = 'running';
    this.initPayload = {
      protocolVersion: PROTOCOL_VERSION,
      tickRate: this.config.tickRate,
      snapshotRate: this.config.snapshotRate,
      mode: this.room.settings.mode,
      mapId: this.room.settings.mapId,
      mapSeed: this.simulation.state.match.mapSeed,
      matchSeed: this.simulation.state.match.matchSeed,
      players: buildSnapshot(this.simulation).players,
    };
    this.transport.emitToRoom(this.room.id, SERVER_EVENTS.matchInit, this.initPayload);
    this.lastTime = Date.now();
    this.timer = setInterval(() => this.pump(), this.stepMs);
    this.timer.unref?.();
    this.logger.info?.({ roomId: this.room.id }, 'match start');
  }

  acceptInput(playerId, input) {
    return this.simulation.setInput(playerId, input);
  }

  acceptAttackStart(playerId, aimX, aimZ) {
    return this.simulation.attackStart(playerId, aimX, aimZ);
  }

  acceptAttackRelease(playerId, aimX, aimZ) {
    return this.simulation.attackRelease(playerId, aimX, aimZ);
  }

  acceptSuper(playerId, payload) {
    return this.simulation.super(playerId, payload);
  }

  acceptSkill(playerId, payload) {
    return this.simulation.skill(playerId, payload);
  }

  acceptItem(playerId, slot = 0) {
    return this.simulation.item(playerId, slot);
  }

  acceptFlicker(playerId, payload) {
    return this.simulation.flicker(playerId, payload);
  }

  sendCurrentState(socket) {
    if (!this.initPayload) return;
    this.transport.emitToSocket(socket, SERVER_EVENTS.matchInit, { ...this.initPayload, players: buildSnapshot(this.simulation).players });
    this.transport.emitToSocket(socket, SERVER_EVENTS.matchSnapshot, buildSnapshot(this.simulation));
  }

  pump() {
    const now = Date.now();
    const elapsed = Math.min(250, Math.max(0, now - this.lastTime));
    this.lastTime = now;
    this.accumulator += elapsed;
    let steps = 0;
    while (this.accumulator >= this.stepMs && steps < (this.config.maxCatchupSteps || 5)) {
      this.tick(1 / this.config.tickRate);
      this.accumulator -= this.stepMs;
      steps += 1;
    }
    if (steps >= (this.config.maxCatchupSteps || 5)) this.accumulator = 0;
  }

  tick(dt) {
    this.bots.tick();
    const events = this.simulation.tick(dt);
    for (const event of events) {
      if (event.type === 'MATCH_END') continue;
      this.transport.emitToRoom(this.room.id, SERVER_EVENTS.matchEvent, event);
    }
    this.snapshotCounter += 1;
    // Gameplay events are sent on their own channel. Do not turn every combat
    // event into a full world snapshot; at 8 players this otherwise doubles
    // snapshot traffic exactly when the renderer is already busiest.
    if (this.snapshotCounter >= this.snapshotEvery) {
      this.snapshotCounter = 0;
      this.transport.emitToRoom(this.room.id, SERVER_EVENTS.matchSnapshot, buildSnapshot(this.simulation));
    }
    if (this.simulation.state.match.status === 'ended') this.finish();
  }

  removePlayer(playerId) {
    this.simulation.removePlayer(playerId);
  }

  setPlayerConnected(playerId, connected) {
    const player = this.simulation.state.players.get(playerId);
    if (!player) return;
    player.connected = connected;
    if (!connected) {
      player.input.moveX = 0;
      player.input.moveZ = 0;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.room.match = null;
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    const match = this.simulation.state.match;
    const result = {
      reason: match.endReason || 'server',
      winnerId: match.winnerId || null,
      scores: [...this.simulation.state.players.values()].map((player) => ({ id: player.id, name: player.name, kills: player.kills, deaths: player.deaths, alive: player.alive })),
      match: { ...match },
    };
    this.transport.emitToRoom(this.room.id, SERVER_EVENTS.matchEnd, result);
    this.room.status = 'ended';
    for (const player of this.room.players.values()) player.ready = false;
    this.room.status = 'lobby';
    this.transport.emitToRoom(this.room.id, SERVER_EVENTS.roomState, this.room.toPublicState());
    this.stop();
    this.onFinished?.(result);
  }
}
