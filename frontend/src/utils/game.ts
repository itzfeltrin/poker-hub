import type { ApiGame, ApiGamePlayer } from "@/api/types";

/** UI shape for a game player (used in history, new game form). */
export interface GamePlayer {
  playerId: string;
  buyIn: number;
  cashOut: number;
}

/** UI shape for a game (used in history, index, new game). */
export interface Game {
  id: string;
  date: string;
  location: string;
  players: GamePlayer[];
  notes?: string;
}

/** Convert API game to UI game (cashOut from final_chips/chips_per_player*buy_in). */
export function apiGameToGame(g: ApiGame, locationPlaceholder = "—"): Game {
  return {
    id: g.id,
    date: g.date,
    location: locationPlaceholder,
    players: g.players.map((p: ApiGamePlayer) => ({
      playerId: p.player_id,
      buyIn: g.buy_in,
      cashOut:
        p.final_chips != null
          ? (p.final_chips / g.chips_per_player) * g.buy_in
          : 0,
    })),
  };
}
