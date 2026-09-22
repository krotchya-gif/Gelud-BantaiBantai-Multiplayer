import { z } from 'zod';
import { MAP_DEFINITIONS } from '../maps/MapDefinitions.js';

const finiteNumber = z.number().finite();
const mapIdSchema = z.string().trim().min(1).max(64).refine((value) => Object.hasOwn(MAP_DEFINITIONS, value), {
  message: 'Map tidak tersedia.',
});

export const sessionHelloSchema = z.object({
  sessionId: z.string().min(1).max(80).optional(),
  reconnectToken: z.string().min(16).max(200).optional(),
  name: z.string().trim().min(1).max(20).optional(),
  clientBuild: z.string().max(80).optional(),
  protocolVersion: z.number().int().positive(),
}).strict();

export const roomCreateSchema = z.object({
  mode: z.enum(['classic', 'blitz', 'deathmatch']).default('deathmatch'),
  mapId: mapIdSchema.default('open'),
  maxPlayers: z.number().int().min(2).max(8).default(8),
}).strict();

export const roomJoinSchema = z.object({
  code: z.string().trim().min(4).max(8),
}).strict();

export const selectCharacterSchema = z.object({
  characterId: z.string().trim().min(1).max(32),
}).strict();

export const readySchema = z.object({ ready: z.boolean() }).strict();

export const settingsSchema = z.object({
  mode: z.enum(['classic', 'blitz', 'deathmatch']).optional(),
  mapId: mapIdSchema.optional(),
  maxPlayers: z.number().int().min(2).max(8).optional(),
}).strict();

export const moveInputSchema = z.object({
  seq: z.number().int().nonnegative(),
  moveX: finiteNumber.pipe(z.number().min(-1).max(1)),
  moveZ: finiteNumber.pipe(z.number().min(-1).max(1)),
  aimX: finiteNumber.pipe(z.number().min(-1).max(1)).optional(),
  aimZ: finiteNumber.pipe(z.number().min(-1).max(1)).optional(),
  clientTick: z.number().int().nonnegative().optional(),
}).strict();

export const attackStartSchema = z.object({
  actionId: z.number().int().nonnegative(),
  aimX: finiteNumber.pipe(z.number().min(-1).max(1)),
  aimZ: finiteNumber.pipe(z.number().min(-1).max(1)),
}).strict();

export const attackReleaseSchema = attackStartSchema;

export const targetSchema = z.object({
  actionId: z.number().int().nonnegative(),
  targetX: finiteNumber,
  targetZ: finiteNumber,
}).strict();

export const superSchema = z.object({
  actionId: z.number().int().nonnegative(),
  aimX: finiteNumber.pipe(z.number().min(-1).max(1)).optional(),
  aimZ: finiteNumber.pipe(z.number().min(-1).max(1)).optional(),
  targetX: finiteNumber.optional(),
  targetZ: finiteNumber.optional(),
}).strict();

export const itemSchema = z.object({
  actionId: z.number().int().nonnegative(),
}).strict();

export function parsePayload(schema, payload) {
  const result = schema.safeParse(payload);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
