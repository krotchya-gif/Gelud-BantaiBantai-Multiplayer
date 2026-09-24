import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/protocol/events.js';
import { StateBuffer } from './StateBuffer.js';
import { InputHistory, predictMovement } from './Prediction.js';
import { reconcile } from './Reconciliation.js';
import { getCharacterDef } from '../../shared/data/characters.js';
import { createMapCollision } from '../../shared/maps/MapDefinitions.js';

export class NetworkGameSession extends EventTarget {
  constructor(networkClient, { collision = null, interpolationDelayMs = 100 } = {}) {
    super();
    this.network = networkClient;
    this.collision = collision || createMapCollision('open', 0);
    this.mapId = 'open';
    this.stateBuffer = new StateBuffer({ delayMs: interpolationDelayMs });
    this.inputHistory = new InputHistory();
    this.localPlayerId = null;
    this.localPlayer = null;
    this.nextInputSeq = 0;
    this.nextActionId = 0;
    this.latestSnapshot = null;
    this.latestInput = { moveX: 0, moveZ: 0, aimX: 0, aimZ: 1 };
    this.network.addEventListener(SERVER_EVENTS.matchInit, ({ detail }) => this.onInit(detail));
    this.network.addEventListener(SERVER_EVENTS.matchSnapshot, ({ detail }) => this.onSnapshot(detail));
    this.network.addEventListener(SERVER_EVENTS.matchEvent, ({ detail }) => this.dispatchEvent(new CustomEvent('game-event', { detail })));
    this.network.addEventListener(SERVER_EVENTS.matchEnd, ({ detail }) => this.dispatchEvent(new CustomEvent('match-end', { detail })));
    this.network.addEventListener('connect', () => this.dispatchEvent(new CustomEvent('connection', { detail: { connected: true } })));
    this.network.addEventListener('disconnect', () => this.dispatchEvent(new CustomEvent('connection', { detail: { connected: false } })));
    this.network.addEventListener(SERVER_EVENTS.sessionRecovered, ({ detail }) => this.dispatchEvent(new CustomEvent('session-recovered', { detail })));
  }

  onInit(payload) {
    this.mapId = payload.mapId || 'open';
    this.collision = createMapCollision(this.mapId, payload.mapSeed || 0);
    this.stateBuffer.clear();
    this.inputHistory = new InputHistory();
    this.localPlayerId = this.network.playerId || null;
    this.localPlayer = payload.players?.find((player) => player.id === this.localPlayerId) || null;
    this.latestInput = {
      moveX: 0,
      moveZ: 0,
      aimX: Math.sin(this.localPlayer?.facing || 0),
      aimZ: Math.cos(this.localPlayer?.facing || 0),
    };
    this.latestSnapshot = { players: payload.players, match: payload };
    this.dispatchEvent(new CustomEvent('match-init', { detail: payload }));
  }

  onSnapshot(snapshot) {
    this.latestSnapshot = snapshot;
    this.stateBuffer.push(snapshot);
    const ack = snapshot.ack?.[this.localPlayerId];
    if (Number.isInteger(ack)) this.inputHistory.acknowledge(ack);
    const authoritative = snapshot.players?.find((player) => player.id === this.localPlayerId);
    if (authoritative && this.localPlayer) {
      this.localPlayer = reconcile(authoritative, this.inputHistory.pending(), (player, input) => player.alive === false
        ? player
        : predictMovement(
          player,
          input,
          1 / 30,
          getCharacterDef(player.characterId).speed,
          this.collision,
          this.mapId,
        ));
    }
    this.dispatchEvent(new CustomEvent('snapshot', { detail: snapshot }));
  }

  sendMovement(input) {
    const payload = { seq: this.nextInputSeq += 1, ...input };
    this.inputHistory.add(payload);
    this.latestInput = payload;
    this.network.emit(CLIENT_EVENTS.inputMove, payload);
    return payload.seq;
  }

  advancePrediction(dt) {
    if (!this.localPlayer || !this.localPlayer.alive || !Number.isFinite(dt) || dt <= 0) return this.localPlayer;
    this.localPlayer = predictMovement(
      this.localPlayer,
      this.latestInput,
      Math.min(0.05, dt),
      getCharacterDef(this.localPlayer.characterId).speed,
      this.collision,
      this.mapId,
    );
    return this.localPlayer;
  }

  sendAttackStart(aimX, aimZ) {
    const actionId = ++this.nextActionId;
    const aim = this.resolveAim(aimX, aimZ);
    this.network.emit(CLIENT_EVENTS.actionAttackStart, { actionId, ...aim });
    return actionId;
  }

  sendAttackRelease(aimX, aimZ) {
    const actionId = ++this.nextActionId;
    const aim = this.resolveAim(aimX, aimZ);
    this.network.emit(CLIENT_EVENTS.actionAttackRelease, { actionId, ...aim });
    return actionId;
  }

  sendSuper(aimX, aimZ, targetX, targetZ) {
    const aim = this.resolveAim(aimX, aimZ);
    this.network.emit(CLIENT_EVENTS.actionSuper, { actionId: ++this.nextActionId, ...aim, targetX, targetZ });
  }

  sendSkill(skill, phase = 'activate', aimX, aimZ, targetX, targetZ) {
    const aim = this.resolveAim(aimX, aimZ);
    this.network.emit(CLIENT_EVENTS.actionSkill, { actionId: ++this.nextActionId, skill: skill === 2 ? 2 : 1, phase, ...aim, targetX, targetZ });
  }

  resolveAim(aimX, aimZ) {
    let x = Number.isFinite(aimX) ? aimX : 0;
    let z = Number.isFinite(aimZ) ? aimZ : 0;
    if (Math.hypot(x, z) <= 1e-8) {
      x = this.latestInput.aimX;
      z = this.latestInput.aimZ;
    }
    if (Math.hypot(x, z) <= 1e-8 && this.localPlayer) {
      x = Math.sin(this.localPlayer.facing || 0);
      z = Math.cos(this.localPlayer.facing || 0);
    }
    const length = Math.hypot(x, z) || 1;
    return { aimX: x / length, aimZ: z / length };
  }

  sendItem(slot = 0) {
    this.network.emit(CLIENT_EVENTS.actionItem, { actionId: ++this.nextActionId, slot: slot === 1 ? 1 : 0 });
  }

  sendFlicker(dirX, dirZ) {
    this.network.emit(CLIENT_EVENTS.actionFlicker, { actionId: ++this.nextActionId, dirX, dirZ });
  }

  renderState(now = Date.now()) {
    return this.stateBuffer.sample(now);
  }
}
