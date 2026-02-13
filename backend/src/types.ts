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
  Last7Days = "ultimos_7_dias",
  LastMonth = "ultimo_mes",
  LastYear = "ultimo_ano",
  AllTime = "todo_periodo",
  Custom = "personalizado",
}
