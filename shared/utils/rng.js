export function normalizeSeed(seed) {
  const value = Number(seed);
  return Number.isFinite(value) ? value | 0 : 0;
}

export class SeededRng {
  constructor(seed = 0) {
    this.state = normalizeSeed(seed) || 0x6d2b79f5;
  }

  next() {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  int(min, max) {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    if (high < low) throw new RangeError('Invalid RNG integer range');
    return low + Math.floor(this.next() * (high - low + 1));
  }

  pick(values) {
    if (!Array.isArray(values) || values.length === 0) return undefined;
    return values[Math.floor(this.next() * values.length)];
  }
}
