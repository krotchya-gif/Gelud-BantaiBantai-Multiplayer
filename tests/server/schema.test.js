import { describe, expect, it } from 'vitest';
import { moveInputSchema, roomCreateSchema, sessionHelloSchema, settingsSchema } from '../../shared/protocol/schemas.js';

describe('protocol schemas', () => {
  it('accepts bounded movement intent', () => {
    expect(moveInputSchema.safeParse({ seq: 1, moveX: 1, moveZ: -1 }).success).toBe(true);
    expect(moveInputSchema.safeParse({ seq: 1, moveX: 2, moveZ: 0 }).success).toBe(false);
  });

  it('requires protocol version on hello', () => {
    expect(sessionHelloSchema.safeParse({ protocolVersion: 1, name: 'A' }).success).toBe(true);
    expect(sessionHelloSchema.safeParse({ name: 'A' }).success).toBe(false);
  });

  it('only accepts maps exposed by the shared map catalog', () => {
    expect(roomCreateSchema.safeParse({ mapId: 'frozen-lake' }).success).toBe(true);
    expect(roomCreateSchema.safeParse({ mapId: 'made-up-map' }).success).toBe(false);
    expect(settingsSchema.safeParse({ mapId: 'gravity-rifts' }).success).toBe(true);
  });
});
