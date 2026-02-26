import type { ApiGameWithPlayers, ApiProfitLoss } from "@poker-hub/db";
import * as R from "remeda";

/** Get profit/loss for a player from the profit-loss API response. */
export function getPlayerPnL(
  profitLoss: ApiProfitLoss | undefined,
  playerId: string,
): number {
  if (!profitLoss?.players) return 0;

  return R.pipe(
    profitLoss.players,
    R.find((p) => p.id === playerId),
    R.prop("profitLoss"),
    R.defaultTo(0),
  );
}

/** Count how many games a player participated in. */
export function getPlayerGamesCount(
  games: ApiGameWithPlayers[] | undefined,
  playerId: string,
): number {
  if (!games) return 0;

  return R.pipe(
    games,
    R.filter((g) => g.players.some((p) => p.id === playerId)),
    R.length(),
  );
}

/** Find a player by id in a list. */
export function getPlayerById(
  players: { id: string; name: string }[] | undefined,
  id: string,
): { id: string; name: string } | undefined {
  if (!players) return undefined;

  return R.find(players, (p) => p.id === id);
}
