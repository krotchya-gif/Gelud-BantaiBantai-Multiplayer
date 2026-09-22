import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../shared/utils/rng.js';

describe('SeededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = new SeededRng(42);
    const second = new SeededRng(42);
    expect(Array.from({ length: 20 }, () => first.next())).toEqual(
      Array.from({ length: 20 }, () => second.next()),
    );
  });

  it('stays inside an integer range', () => {
    const rng = new SeededRng(7);
    for (let index = 0; index < 100; index += 1) {
      const value = rng.int(2, 5);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
    }
  });
});
