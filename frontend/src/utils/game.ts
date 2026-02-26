import type { ApiGameWithPlayers } from "@/api/types";

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
  location: string | null;
  players: GamePlayer[];
  notes?: string;
}

/** Convert API game to UI game (cashOut from finalChips/chipsPerPlayer*buyIn). */
export function apiGameToGame(
  g: ApiGameWithPlayers,
  _locationPlaceholder = "—",
): Game {
  return {
    id: g.id,
    date: g.date,
    location: g.location,
    players: g.players.map((p) => ({
      playerId: p.playerId,
      buyIn: g.buyIn,
      cashOut:
        p.finalChips != null
          ? (p.finalChips / g.chipsPerPlayer) * g.buyIn
          : 0,
    })),
  };
}
