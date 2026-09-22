export class FixedStepClock {
  constructor({ tickRate = 30, maxCatchupTicks = 5, onTick }) {
    if (!Number.isFinite(tickRate) || tickRate <= 0) throw new RangeError('tickRate must be positive');
    if (typeof onTick !== 'function') throw new TypeError('onTick must be a function');
    this.stepMs = 1000 / tickRate;
    this.maxCatchupTicks = maxCatchupTicks;
    this.onTick = onTick;
    this.previous = null;
    this.accumulator = 0;
    this.overruns = 0;
  }

  reset(now = nowMs()) {
    this.previous = now;
    this.accumulator = 0;
  }

  advance(now = nowMs()) {
    if (this.previous === null) this.reset(now);
    this.accumulator += Math.max(0, now - this.previous);
    this.previous = now;
    let steps = 0;
    while (this.accumulator >= this.stepMs && steps < this.maxCatchupTicks) {
      this.onTick(this.stepMs / 1000);
      this.accumulator -= this.stepMs;
      steps += 1;
    }
    if (this.accumulator >= this.stepMs) {
      this.accumulator = 0;
      this.overruns += 1;
    }
    return steps;
  }
}

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}
