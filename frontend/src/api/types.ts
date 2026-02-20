/** API response types (snake_case) matching backend */

export interface ApiPlayer {
  id: string;
  name: string;
}

export interface ApiGamePlayer {
  player_id: string;
  name: string;
  initial_chips: number;
  final_chips: number | null;
}

export interface ApiGame {
  id: string;
  date: string;
  buy_in: number;
  chips_per_player: number;
  finished: boolean;
  players: ApiGamePlayer[];
}

export interface ApiProfitLossPlayer {
  player_id: string;
  name: string;
  total_buy_in: number;
  total_cash_out: number;
  profit_loss: number;
}

export interface ApiProfitLossResponse {
  period: string;
  start_date?: string;
  end_date?: string;
  players: ApiProfitLossPlayer[];
}
