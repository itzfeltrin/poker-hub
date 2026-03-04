import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ApiGameWithPlayersSchema,
  gamePlayerBuyIns,
  gamePlayers,
  games,
  players,
} from "@poker-hub/db";
import * as R from "remeda";
import z from "zod";

const app = new Hono();

app.get("/", (c) => {
  const rows = R.pipe(
    // Fetch all game rows
    db.select().from(games).orderBy(desc(games.date)).all(),
    // For each game row, fetch the game players
    R.map((game) => {
      const participants = db
        .select({
          playerId: gamePlayers.playerId,
          name: players.name,
          cashOut: gamePlayers.cashOut,
        })
        .from(gamePlayers)
        .innerJoin(players, eq(players.id, gamePlayers.playerId))
        .where(eq(gamePlayers.gameId, game.id))
        .all();

      const buyInRows = db
        .select({
          playerId: gamePlayerBuyIns.playerId,
          chips: gamePlayerBuyIns.chips,
        })
        .from(gamePlayerBuyIns)
        .where(eq(gamePlayerBuyIns.gameId, game.id))
        .all();

      const buyInsByPlayer = R.groupBy(buyInRows, (b) => b.playerId);

      const gamePlayerRows = R.pipe(
        participants,
        R.map((p) => {
          const initialChips = R.sumBy(
            buyInsByPlayer[p.playerId] ?? [],
            (b) => b.chips,
          );
          return {
            id: p.playerId,
            name: p.name,
            initialChips,
            cashOut: p.cashOut,
          };
        }),
      );

      return {
        ...game,
        players: gamePlayerRows,
      };
    }),
  );

  const apiGamesWithPlayers = z.array(ApiGameWithPlayersSchema).safeParse(rows);
  if (!apiGamesWithPlayers.success) {
    return c.json({ error: apiGamesWithPlayers.error.issues[0]?.message }, 400);
  }

  return c.json(apiGamesWithPlayers.data);
});

export default app;
