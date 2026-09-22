import { lerp } from '../../shared/utils/math.js';

export class StateBuffer {
  constructor({ delayMs = 100, maxSnapshots = 32 } = {}) {
    this.delayMs = delayMs;
    this.maxSnapshots = maxSnapshots;
    this.snapshots = [];
  }

  push(snapshot, receivedAt = Date.now()) {
    this.snapshots.push({ snapshot, receivedAt });
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.splice(0, this.snapshots.length - this.maxSnapshots);
  }

  clear() {
    this.snapshots.length = 0;
  }

  sample(now = Date.now()) {
    if (!this.snapshots.length) return null;
    const target = now - this.delayMs;
    let before = this.snapshots[0];
    let after = this.snapshots[this.snapshots.length - 1];
    for (let index = 1; index < this.snapshots.length; index += 1) {
      const candidate = this.snapshots[index];
      if (candidate.receivedAt >= target) {
        after = candidate;
        before = this.snapshots[index - 1];
        break;
      }
    }
    const span = after.receivedAt - before.receivedAt;
    const amount = span > 0 ? Math.max(0, Math.min(1, (target - before.receivedAt) / span)) : 1;
    return interpolateSnapshot(before.snapshot, after.snapshot, amount);
  }
}

function interpolateSnapshot(first, second, amount) {
  const firstPlayers = new Map((first.players || []).map((player) => [player.id, player]));
  const players = (second.players || []).map((player) => {
    const previous = firstPlayers.get(player.id);
    if (!previous) return { ...player };
    return {
      ...player,
      x: lerp(previous.x, player.x, amount),
      z: lerp(previous.z, player.z, amount),
      velX: lerp(previous.velX || 0, player.velX || 0, amount),
      velZ: lerp(previous.velZ || 0, player.velZ || 0, amount),
      facing: lerpAngle(previous.facing, player.facing, amount),
    };
  });
  return {
    ...second,
    players,
    projectiles: interpolatePositions(first.projectiles, second.projectiles, amount),
    items: interpolatePositions(first.items, second.items, amount),
    areaEffects: interpolatePositions(first.areaEffects, second.areaEffects, amount),
  };
}

function interpolatePositions(firstEntries = [], secondEntries = [], amount) {
  const firstById = new Map(firstEntries.map((entry) => [entry.id, entry]));
  return secondEntries.map((entry) => {
    const previous = firstById.get(entry.id);
    if (!previous || !Number.isFinite(previous.x) || !Number.isFinite(entry.x)) return { ...entry };
    return {
      ...entry,
      x: lerp(previous.x, entry.x, amount),
      z: lerp(previous.z, entry.z, amount),
      remaining: Number.isFinite(previous.remaining) && Number.isFinite(entry.remaining)
        ? lerp(previous.remaining, entry.remaining, amount)
        : entry.remaining,
    };
  });
}

function lerpAngle(a, b, amount) {
  let delta = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * amount;
}
