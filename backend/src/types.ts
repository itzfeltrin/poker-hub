export type Player = {
  id: string;
  name: string;
};

export type Game = {
  id: string;
  date: string;
  buyIn: number;
  chipsPerPlayer: number;
  location: string | null;
  finished: boolean;
};

export type GamePlayer = {
  gameId: string;
  playerId: string;
  initialChips: number;
  finalChips: number | null;
};

export type GameWithPlayers = Game & {
  players: Array<{
    playerId: string;
    name: string;
    initialChips: number;
    finalChips: number | null;
  }>;
};

export type ProfitLoss = {
  playerId: string;
  name: string;
  totalIn: number;
  totalOut: number;
  profitLoss: number;
};

export enum PeriodFilter {
  Last7Days = "last_7_days",
  LastMonth = "last_month",
  LastYear = "last_year",
  AllTime = "all_time",
  Custom = "custom",
}
