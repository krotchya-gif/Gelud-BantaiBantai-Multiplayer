import { describe, expect, it } from 'vitest';
import { BotSystem } from '../../server/match/BotSystem.js';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';

describe('server bots', () => {
  it('adds deterministic bot players and produces input', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'Human', characterId: 'dusty' }] });
    const bots = new BotSystem(simulation, { count: 1 });
    expect(bots.botIds).toEqual(['bot_1']);
    bots.tick();
    expect(simulation.state.players.get('bot_1').input.seq).toBe(1);
  });
});
