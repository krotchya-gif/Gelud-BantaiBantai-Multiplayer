import { addPlayerState } from '../../shared/simulation/SimulationState.js';
import { CHARACTER_DEFS } from '../../shared/data/characters.js';
import { normalize2 } from '../../shared/utils/math.js';

const BOT_NAMES = ['Rusty', 'Nova', 'Pixel', 'Bolt', 'Maple', 'Onyx', 'Ziggy', 'Comet'];
const BOT_CHARACTERS = Object.keys(CHARACTER_DEFS);

function createBotRoster(count, seed = 0) {
  const available = [...BOT_CHARACTERS];
  let state = ((seed | 0) ^ 0x51ed270b) >>> 0;
  const nextRandom = () => {
    let value = (state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = available.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
  }
  const roster = available.slice(0, Math.min(count, available.length));
  while (roster.length < count) roster.push(available[Math.floor(nextRandom() * available.length)]);
  return roster;
}

export class BotSystem {
  constructor(simulation, { count = 0 } = {}) {
    this.simulation = simulation;
    this.botIds = [];
    const botCount = Math.max(0, Math.floor(count));
    const roster = createBotRoster(botCount, simulation.state.match.matchSeed);
    for (let index = 0; index < botCount; index += 1) {
      const id = `bot_${index + 1}`;
      this.botIds.push(id);
      const point = simulation.state.spawnPoints[index % simulation.state.spawnPoints.length] || { x: 0, z: 0 };
      addPlayerState(simulation.state, { id, name: BOT_NAMES[index % BOT_NAMES.length], characterId: roster[index], connected: true }, point);
    }
  }

  tick() {
    const state = this.simulation.state;
    for (const botId of this.botIds) {
      const bot = state.players.get(botId);
      if (!bot || !bot.alive) continue;
      const target = [...state.players.values()]
        .filter((player) => player.id !== bot.id && player.alive && player.connected !== false)
        .sort((a, b) => Math.hypot(a.x - bot.x, a.z - bot.z) - Math.hypot(b.x - bot.x, b.z - bot.z))[0];
      if (!target) continue;
      const direction = normalize2(target.x - bot.x, target.z - bot.z);
      const distance = Math.hypot(target.x - bot.x, target.z - bot.z);
      this.simulation.setInput(bot.id, { seq: bot.input.seq + 1, moveX: distance > 4 ? direction.x : -direction.x * 0.2, moveZ: distance > 4 ? direction.z : -direction.z * 0.2, aimX: direction.x, aimZ: direction.z });
      const flickered = distance <= 2.8 && this.simulation.flicker(bot.id, { dirX: -direction.x, dirZ: -direction.z });
      if (!flickered && distance <= 12 && bot.attackCooldown <= 0) this.simulation.attackStart(bot.id, direction.x, direction.z);
      if (bot.superCharge >= 1 && distance <= 10) this.simulation.super(bot.id, { aimX: direction.x, aimZ: direction.z, targetX: target.x, targetZ: target.z });
    }
  }
}
