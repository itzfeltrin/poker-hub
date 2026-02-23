import type { GameRow } from "../schema";

export type ApiGame = GameRow;

export type ApiGameCreate = Omit<GameRow, "id"> & {
  player_ids: string[];
};

export type ApiGameFinalize = {
  final_chips: Record<string, number>;
};
