import { randomInt } from 'node:crypto';
import { ROOM_ALPHABET } from '../../shared/config/network.js';

export function createRoomCode(length = 6) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)];
  }
  return code;
}
