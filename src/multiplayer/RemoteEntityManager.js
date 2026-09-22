export class RemoteEntityManager {
  constructor({ create, update, remove } = {}) {
    this.entities = new Map();
    this.create = create || (() => ({}));
    this.update = update || (() => {});
    this.remove = remove || (() => {});
  }

  apply(players) {
    const seen = new Set();
    for (const player of players) {
      seen.add(player.id);
      let entity = this.entities.get(player.id);
      if (!entity) {
        entity = this.create(player);
        this.entities.set(player.id, entity);
      }
      this.update(entity, player);
    }
    for (const [id, entity] of this.entities) {
      if (seen.has(id)) continue;
      this.remove(entity, id);
      this.entities.delete(id);
    }
  }

  clear() {
    for (const [id, entity] of this.entities) this.remove(entity, id);
    this.entities.clear();
  }
}
