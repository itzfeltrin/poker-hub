export type Player = {
  id: string;
  name: string;
};

export type Game = {
  id: string;
  date: string;
  buy_in: number;
  chips_per_player: number;
  finished: boolean;
};

export type GamePlayer = {
  game_id: string;
  player_id: string;
  initial_chips: number;
  final_chips: number | null;
};

export type GameWithPlayers = Game & {
  players: Array<{
    player_id: string;
    name: string;
    initial_chips: number;
    final_chips: number | null;
  }>;
};

export type ProfitLoss = {
  player_id: string;
  name: string;
  total_in: number;
  total_out: number;
  profit_loss: number;
};

export enum PeriodFilter {
  Last7Days = "last_7_days",
  LastMonth = "last_month",
  LastYear = "last_year",
  AllTime = "all_time",
  Custom = "custom",
}
