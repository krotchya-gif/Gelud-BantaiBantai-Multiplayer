import { describe, expect, it } from 'vitest';
import { StateBuffer } from '../../src/multiplayer/StateBuffer.js';

describe('StateBuffer', () => {
  it('interpolates remote player position at a delayed render time', () => {
    const buffer = new StateBuffer({ delayMs: 0 });
    buffer.push({ players: [{ id: 'p1', x: 0, z: 0, facing: 0 }] }, 0);
    buffer.push({ players: [{ id: 'p1', x: 10, z: 4, facing: Math.PI }] }, 100);
    const state = buffer.sample(50);
    expect(state.players[0].x).toBe(5);
    expect(state.players[0].z).toBe(2);
  });

  it('extrapolates a short network gap using the authoritative velocity', () => {
    const buffer = new StateBuffer({ delayMs: 0, maxExtrapolationMs: 50 });
    buffer.push({ players: [{ id: 'p1', x: 0, z: 0, velX: 4, velZ: -2, facing: 0 }] }, 0);
    const state = buffer.sample(50);
    expect(state.players[0].x).toBeCloseTo(0.2);
    expect(state.players[0].z).toBeCloseTo(-0.1);
  });
});
