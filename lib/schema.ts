import { z } from 'zod/v4-mini';

// Zod schemas
export const PlayerIdSchema = z.string().check(z.regex(/^(mk2!)?EI\d{16}$/, 'Invalid player ID format'));
export const PlayerNameSchema = z.string();
export const EidStoreFromDiskSchema = z.record(PlayerIdSchema, PlayerNameSchema, 'invalid player names object');
