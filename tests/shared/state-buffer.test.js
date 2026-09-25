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

  it('keeps sticky projectiles attached while extrapolating free projectiles', () => {
    const buffer = new StateBuffer({ delayMs: 0, maxExtrapolationMs: 50 });
    buffer.push({
      players: [{ id: 'p1', x: 4, z: 5, velX: 1, velZ: -1 }],
      projectiles: [
        { id: 'sticky-player', x: 4.25, z: 4.8, dirX: 1, dirZ: 0, speed: 20, stickyTargetId: 'p1', stickyOffsetX: 0.25, stickyOffsetZ: -0.2 },
        { id: 'sticky-cover', x: 2, z: 3, dirX: 0, dirZ: 1, speed: 20, stickyTargetId: 'cover' },
        { id: 'free', x: 1, z: 1, dirX: 1, dirZ: 0, speed: 20 },
      ],
    }, 0);

    const state = buffer.sample(50);
    expect(state.projectiles.find(({ id }) => id === 'sticky-player')).toMatchObject({ x: 4.3, z: 4.75 });
    expect(state.projectiles.find(({ id }) => id === 'sticky-cover')).toMatchObject({ x: 2, z: 3 });
    expect(state.projectiles.find(({ id }) => id === 'free')).toMatchObject({ x: 2, z: 1 });
  });
});
