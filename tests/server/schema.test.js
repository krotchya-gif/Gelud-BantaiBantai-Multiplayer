import { describe, expect, it } from 'vitest';
import { itemSchema, moveInputSchema, roomCreateSchema, sessionHelloSchema, settingsSchema } from '../../shared/protocol/schemas.js';

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

  it('accepts two independent item slots and defaults legacy item actions to slot one', () => {
    expect(itemSchema.parse({ actionId: 7 })).toEqual({ actionId: 7, slot: 0 });
    expect(itemSchema.safeParse({ actionId: 8, slot: 1 }).success).toBe(true);
    expect(itemSchema.safeParse({ actionId: 9, slot: 2 }).success).toBe(false);
  });
});
