/**
 * API types derived from the Drizzle schema (single source of truth).
 * Add new columns in schema.ts only; these types stay in sync.
 */
import type { GamePlayerRow, GameRow } from "../schema";
import type { RowToApi } from "../lib/camel-to-snake";

type ApiGameRow = RowToApi<GameRow>;

export type ApiGamePlayer = Pick<
  RowToApi<GamePlayerRow>,
  "player_id" | "initial_chips" | "final_chips"
> & { name: string };

export type ApiGame = ApiGameRow & {
  players: ApiGamePlayer[];
};

export interface ApiGameCreate {
  date: string;
  buy_in: number;
  chips_per_player: number;
  location: string;
  player_ids: string[];
}

export interface ApiGameFinalize {
  final_chips: Record<string, number>;
}
