import { describe, expect, it } from 'vitest';
import { BotSystem } from '../../server/match/BotSystem.js';
import { CHARACTER_DEFS } from '../../shared/data/characters.js';
import { GameSimulation } from '../../shared/simulation/GameSimulation.js';

describe('server bots', () => {
  it('adds deterministic bot players and produces input', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'Human', characterId: 'dusty' }] });
    const bots = new BotSystem(simulation, { count: 1 });
    expect(bots.botIds).toEqual(['bot_1']);
    bots.tick();
    expect(simulation.state.players.get('bot_1').input.seq).toBe(1);
  });

  it('uses the full shared character roster before repeating bot picks', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'Human', characterId: 'dusty' }] });
    const bots = new BotSystem(simulation, { count: Object.keys(CHARACTER_DEFS).length });
    const roster = bots.botIds.map(id => simulation.state.players.get(id).characterId);
    expect(new Set(roster)).toEqual(new Set(Object.keys(CHARACTER_DEFS)));
  });

  it('aims at the nearest bot when a human player is farther away', () => {
    const simulation = new GameSimulation({ players: [{ id: 'p1', name: 'Human', characterId: 'dusty', x: 10, z: 0 }] });
    const bots = new BotSystem(simulation, { count: 2 });
    const nearestBot = simulation.state.players.get('bot_1');
    const otherBot = simulation.state.players.get('bot_2');
    nearestBot.x = 0; nearestBot.z = 0;
    otherBot.x = 0; otherBot.z = 2;
    bots.tick();
    expect(nearestBot.input.aimX).toBeCloseTo(0);
    expect(nearestBot.input.aimZ).toBeCloseTo(1);
  });
});
