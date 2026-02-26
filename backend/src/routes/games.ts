import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { games, gamePlayers, players, ApiGameSchema } from "@poker-hub/db";
import type { GameWithPlayers } from "../types";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json();

  const apiGame = ApiGameSchema.safeParse(body);
  if (!apiGame.success) {
    return c.json({ error: apiGame.error.issues[0]?.message }, 400);
  }

  db.insert(games).values(apiGame.data).run();

  for (const playerId of apiGame.data.playerIds) {
    const { id: gameId, chipsPerPlayer } = apiGame.data;
    db.insert(gamePlayers)
      .values({
        gameId,
        playerId,
        initialChips: chipsPerPlayer,
        finalChips: null,
      })
      .run();
  }

  return c.json(apiGame.data, 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const game = getGameWithPlayers(id);
  if (!game) return c.json({ error: "Game not found" }, 404);
  return c.json(toGameResponse(game));
});

type FinalizeGameBody = {
  finalChips: Record<string, number>;
};

app.patch("/:id/finalize", async (c) => {
  const gameId = c.req.param("id");
  const gameRow = db
    .select({ finished: games.finished })
    .from(games)
    .where(eq(games.id, gameId))
    .get();
  if (!gameRow) return c.json({ error: "Game not found" }, 404);
  if (gameRow.finished)
    return c.json({ error: "Game is already finalized" }, 400);

  const body = await c.req.json<FinalizeGameBody>();
  const finalChips = body.finalChips;
  if (!finalChips || typeof finalChips !== "object") {
    return c.json(
      { error: "finalChips must be an object { playerId: chips }" },
      400,
    );
  }

  const participants = db
    .select({ playerId: gamePlayers.playerId })
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  for (const { playerId } of participants) {
    const chips = finalChips[playerId];
    if (typeof chips !== "number" || chips < 0) {
      return c.json(
        {
          error: `Invalid finalChips for player ${playerId}. Must be a number >= 0`,
        },
        400,
      );
    }
    db.update(gamePlayers)
      .set({ finalChips: chips })
      .where(
        and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.playerId, playerId)),
      )
      .run();
  }

  db.update(games).set({ finished: true }).where(eq(games.id, gameId)).run();
  const updated = getGameWithPlayers(gameId);
  if (!updated) return c.json({ error: "Failed to finalize" }, 500);
  return c.json(toGameResponse(updated));
});

function getGameWithPlayers(gameId: string): GameWithPlayers | null {
  const gameRow = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!gameRow) return null;

  const playerRows = db
    .select({
      playerId: gamePlayers.playerId,
      name: players.name,
      initialChips: gamePlayers.initialChips,
      finalChips: gamePlayers.finalChips,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  return {
    id: gameRow.id,
    date: gameRow.date,
    buyIn: gameRow.buyIn,
    chipsPerPlayer: gameRow.chipsPerPlayer,
    location: gameRow.location,
    finished: gameRow.finished,
    players: playerRows,
  };
}

function toGameResponse(g: GameWithPlayers) {
  return {
    id: g.id,
    date: g.date,
    buyIn: g.buyIn,
    chipsPerPlayer: g.chipsPerPlayer,
    location: g.location,
    finished: g.finished,
    players: g.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      initialChips: p.initialChips,
      finalChips: p.finalChips,
    })),
  };
}

export default app;
export { getGameWithPlayers };
