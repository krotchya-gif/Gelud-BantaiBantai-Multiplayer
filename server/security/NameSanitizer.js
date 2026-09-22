export function sanitizePlayerName(value, fallback = 'Player') {
  const name = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 20);
  return name || fallback;
}
