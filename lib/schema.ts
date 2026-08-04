import { z } from 'zod/v4-mini';

// Zod schemas
export const PlayerIdSchema = z.string().check(z.regex(/^(mk2!)?EI\d{16}$/, 'Invalid player ID format'));
export const PlayerNameSchema = z.string();

// A stored EID entry. `username` is the in-game name auto-captured from the
// player's backup; `nickname` is an optional label the user assigns manually.
export const EidEntrySchema = z.object({
  username: z.optional(z.string()),
  nickname: z.optional(z.string()),
});
export type EidEntry = z.infer<typeof EidEntrySchema>;

// Current on-disk shape: a record of EID -> entry object. Written to a
// versioned localStorage key so older deployed bundles (which expect a record
// of EID -> string) never read it and wipe it on a parse failure.
export const EidStoreFromDiskSchema = z.record(PlayerIdSchema, EidEntrySchema, 'invalid player names object');

// Legacy on-disk shape, read once for migration: values may be a bare string (a
// manual nickname) or an object written by an early build of this feature.
export const EidStoreValueSchema = z.union([PlayerNameSchema, EidEntrySchema]);
export const EidStoreLegacyFromDiskSchema = z.record(
  PlayerIdSchema,
  EidStoreValueSchema,
  'invalid player names object'
);
