import { addPlayerState } from '../../shared/simulation/SimulationState.js';
import { normalize2 } from '../../shared/utils/math.js';

const BOT_NAMES = ['Rusty', 'Nova', 'Pixel', 'Bolt', 'Maple', 'Onyx', 'Ziggy', 'Comet'];
const BOT_CHARACTERS = ['dusty', 'ace', 'fuse', 'titan', 'volt', 'naka', 'ello', 'syafiah'];

export class BotSystem {
  constructor(simulation, { count = 0 } = {}) {
    this.simulation = simulation;
    this.botIds = [];
    for (let index = 0; index < Math.max(0, count); index += 1) {
      const id = `bot_${index + 1}`;
      this.botIds.push(id);
      const point = simulation.state.spawnPoints[index % simulation.state.spawnPoints.length] || { x: 0, z: 0 };
      addPlayerState(simulation.state, { id, name: BOT_NAMES[index % BOT_NAMES.length], characterId: BOT_CHARACTERS[index % BOT_CHARACTERS.length], connected: true }, point);
    }
  }

  tick() {
    const state = this.simulation.state;
    for (const botId of this.botIds) {
      const bot = state.players.get(botId);
      if (!bot || !bot.alive) continue;
      const target = [...state.players.values()]
        .filter((player) => player.id !== bot.id && player.alive)
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
