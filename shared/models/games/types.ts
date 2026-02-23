/**
 * Re-export game API types from backend (derived from Drizzle schema).
 * Single source of truth: add columns in backend db/schema.ts only.
 */
export type {
  ApiGame,
  ApiGameCreate,
  ApiGameFinalize,
  ApiGamePlayer,
} from "../../../backend/src/api-types/games";
