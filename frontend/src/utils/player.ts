import type { ApiGame, ApiProfitLossResponse } from "@/api/types";

/** Get profit/loss for a player from the profit-loss API response. */
export function getPlayerPnL(
  profitLoss: ApiProfitLossResponse | undefined,
  playerId: string
): number {
  if (!profitLoss?.players) return 0;
  const p = profitLoss.players.find((x) => x.player_id === playerId);
  return p?.profit_loss ?? 0;
}

/** Count how many games a player participated in. */
export function getPlayerGamesCount(
  games: ApiGame[] | undefined,
  playerId: string
): number {
  if (!games) return 0;
  return games.filter((g) => g.players.some((p) => p.player_id === playerId)).length;
}

/** Find a player by id in a list. */
export function getPlayerById(
  players: { id: string; name: string }[] | undefined,
  id: string
): { id: string; name: string } | undefined {
  if (!players) return undefined;
  return players.find((p) => p.id === id);
}
