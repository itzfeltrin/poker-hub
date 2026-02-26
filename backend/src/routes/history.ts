import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { gamePlayers, games, players } from "@poker-hub/db";

const app = new Hono();

app.get("/", (c) => {
  const gameRows = db.select().from(games).orderBy(desc(games.date)).all();

  const result = gameRows.map((g) => {
    const playerRows = db
      .select({
        playerId: gamePlayers.playerId,
        name: players.name,
        initialChips: gamePlayers.initialChips,
        finalChips: gamePlayers.finalChips,
      })
      .from(gamePlayers)
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .where(eq(gamePlayers.gameId, g.id))
      .all();

    return {
      id: g.id,
      date: g.date,
      buyIn: g.buyIn,
      chipsPerPlayer: g.chipsPerPlayer,
      finished: g.finished,
      players: playerRows,
      location: g.location,
    };
  });

  return c.json(
    result.map((g) => ({
      id: g.id,
      date: g.date,
      buyIn: g.buyIn,
      chipsPerPlayer: g.chipsPerPlayer,
      finished: g.finished,
      location: g.location,
      players: g.players.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        initialChips: p.initialChips,
        finalChips: p.finalChips,
      })),
    })),
  );
});

export default app;
