export function createEntityId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${uuid.replaceAll('-', '').slice(0, 12)}`;
}
