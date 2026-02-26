import type { GameRow } from "../schema";

export type ApiGame = GameRow;

export type ApiGameCreate = Omit<GameRow, "id"> & {
  playerIds: string[];
};

export type ApiGameFinalize = {
  finalChips: Record<string, number>;
};

export type ApiGamePlayer = {
  playerId: string;
  name: string;
  initialChips: number;
  finalChips: number | null;
};

export type ApiGameWithPlayers = ApiGame & {
  players: ApiGamePlayer[];
};
