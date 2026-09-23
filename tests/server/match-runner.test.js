import { describe, expect, it } from 'vitest';
import { MatchRunner } from '../../server/match/MatchRunner.js';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';

function makeRunner(events) {
  const emitted = [];
  const runner = Object.create(MatchRunner.prototype);
  const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'P1', characterId: 'dusty' }] });
  simulation.tick = () => events;
  Object.assign(runner, {
    room: { id: 'ROOM' },
    bots: { tick() {} },
    simulation,
    snapshotEvery: 2,
    snapshotCounter: 0,
    transport: { emitToRoom(roomId, event) { emitted.push({ roomId, event }); } },
  });
  return { runner, emitted };
}

describe('MatchRunner snapshot cadence', () => {
  it('keeps snapshots at the configured rate while combat events stream', () => {
    const { runner, emitted } = makeRunner([{ type: 'PROJECTILE_SPAWN' }]);
    for (let index = 0; index < 30; index += 1) runner.tick(1 / 30);

    expect(emitted.filter(({ event }) => event === 'match:event')).toHaveLength(30);
    expect(emitted.filter(({ event }) => event === 'match:snapshot')).toHaveLength(15);
  });
});
