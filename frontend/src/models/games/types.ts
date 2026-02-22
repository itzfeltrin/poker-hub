/** API response types (snake_case) matching backend */

export interface ApiGamePlayer {
  player_id: string;
  name: string;
  initial_chips: number;
  final_chips: number | null;
}

export interface ApiGameCreate {
  buy_in: number;
  chips_per_player: number;
  player_ids: string[];
  location: string;
}

export interface ApiGame {
  id: string;
  date: string;
  buy_in: number;
  chips_per_player: number;
  finished: boolean;
  players: ApiGamePlayer[];
}

export interface ApiGameFinalize {
  final_chips: Record<string, number>;
}
