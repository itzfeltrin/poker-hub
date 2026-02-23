import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { games, gamePlayers, players } from "../db/schema";
import type { GameWithPlayers } from "../types";
import type { ApiGame } from "../api-types/games";

const app = new Hono();

app.get("/", (c) => {
  const gameRows = db.select().from(games).orderBy(desc(games.date)).all();

  const result: ApiGame[] = gameRows.map((g) => {
    const playerRows = db
      .select({
        player_id: gamePlayers.playerId,
        name: players.name,
        initial_chips: gamePlayers.initialChips,
        final_chips: gamePlayers.finalChips,
      })
      .from(gamePlayers)
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .where(eq(gamePlayers.gameId, g.id))
      .all();

    return {
      id: g.id,
      date: g.date,
      buy_in: g.buyIn,
      chips_per_player: g.chipsPerPlayer,
      finished: g.finished,
      players: playerRows,
      location: g.location,
    };
  });

  return c.json(
    result.map((g) => ({
      id: g.id,
      date: g.date,
      buy_in: g.buy_in,
      chips_per_player: g.chips_per_player,
      finished: g.finished,
      location: g.location,
      players: g.players.map((p) => ({
        player_id: p.player_id,
        name: p.name,
        initial_chips: p.initial_chips,
        final_chips: p.final_chips,
      })),
    })),
  );
});

export default app;
