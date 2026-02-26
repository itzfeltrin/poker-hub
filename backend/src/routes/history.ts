import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ApiGameWithPlayersSchema,
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
      const gamePlayerRows = db
        .select({
          id: players.id,
          name: players.name,
          initialChips: gamePlayers.initialChips,
          finalChips: gamePlayers.finalChips,
        })
        .from(gamePlayers)
        .innerJoin(players, eq(players.id, gamePlayers.playerId))
        .where(eq(gamePlayers.gameId, game.id))
        .all();

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
