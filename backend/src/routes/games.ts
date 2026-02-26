import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { games, gamePlayers, players, type ApiGameCreate } from "@poker-hub/db";
import type { GameWithPlayers } from "../types";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json<ApiGameCreate>();
  const { buyIn, chipsPerPlayer, playerIds } = body;

  if (typeof buyIn !== "number" || buyIn <= 0) {
    return c.json({ error: "buyIn must be a positive number" }, 400);
  }
  if (typeof chipsPerPlayer !== "number" || chipsPerPlayer <= 0) {
    return c.json({ error: "chipsPerPlayer must be a positive number" }, 400);
  }
  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return c.json(
      { error: "playerIds must be a non-empty array of player IDs" },
      400,
    );
  }

  const id = crypto.randomUUID();

  db.insert(games)
    .values({
      id,
      date: body.date,
      location: body.location,
      buyIn,
      chipsPerPlayer,
      finished: false,
    })
    .run();

  for (const playerId of playerIds) {
    db.insert(gamePlayers)
      .values({
        gameId: id,
        playerId,
        initialChips: chipsPerPlayer,
        finalChips: null,
      })
      .run();
  }

  const game = getGameWithPlayers(id);
  if (!game) return c.json({ error: "Failed to create game" }, 500);
  return c.json(toGameResponse(game), 201);
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
