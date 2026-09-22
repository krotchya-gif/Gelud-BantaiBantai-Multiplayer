import { parsePayload } from '../../shared/protocol/schemas.js';

export function validatePayload(socket, schema, payload) {
  const result = parsePayload(schema, payload);
  if (result.ok) return result.data;
  socket.emit('room:error', {
    code: 'INVALID_PAYLOAD',
    message: 'Data yang dikirim tidak valid.',
  });
  return null;
}
