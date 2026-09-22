export class RateLimiter {
  constructor({ limit, windowMs = 1000 }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.entries = new Map();
  }

  allow(key, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry || now - entry.startedAt >= this.windowMs) {
      this.entries.set(key, { startedAt: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  cleanup(now = Date.now()) {
    for (const [key, entry] of this.entries) {
      if (now - entry.startedAt >= this.windowMs * 2) this.entries.delete(key);
    }
  }
}
