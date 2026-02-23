/**
 * Re-export game API types from @poker-hub/db (derived from Drizzle schema).
 * Single source of truth: add columns in packages/db schema only.
 */
export type {
  ApiGame,
  ApiGameCreate,
  ApiGameFinalize,
  ApiGamePlayer,
} from "@poker-hub/db";
