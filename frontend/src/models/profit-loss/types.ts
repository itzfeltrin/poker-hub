/** API response types (snake_case) matching backend */

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
