import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { games, gamePlayers, players } from "@poker-hub/db/schema";
import type { GameWithPlayers } from "../types";
import type { ApiGameCreate } from "@poker-hub/db";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json<ApiGameCreate>();
  const { buy_in, chips_per_player, player_ids } = body;

  if (typeof buy_in !== "number" || buy_in <= 0) {
    return c.json({ error: "buy_in must be a positive number" }, 400);
  }
  if (typeof chips_per_player !== "number" || chips_per_player <= 0) {
    return c.json({ error: "chips_per_player must be a positive number" }, 400);
  }
  if (!Array.isArray(player_ids) || player_ids.length === 0) {
    return c.json(
      { error: "player_ids must be a non-empty array of player IDs" },
      400,
    );
  }

  const id = crypto.randomUUID();

  db.insert(games)
    .values({
      id,
      date: body.date,
      location: body.location,
      buyIn: buy_in,
      chipsPerPlayer: chips_per_player,
      finished: false,
    })
    .run();

  for (const playerId of player_ids) {
    db.insert(gamePlayers)
      .values({
        gameId: id,
        playerId,
        initialChips: chips_per_player,
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
  final_chips: Record<string, number>;
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
  const finalChips = body.final_chips;
  if (!finalChips || typeof finalChips !== "object") {
    return c.json(
      { error: "final_chips must be an object { player_id: chips }" },
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
          error: `Invalid final_chips for player ${playerId}. Must be a number >= 0`,
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
      player_id: gamePlayers.playerId,
      name: players.name,
      initial_chips: gamePlayers.initialChips,
      final_chips: gamePlayers.finalChips,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  return {
    id: gameRow.id,
    date: gameRow.date,
    buy_in: gameRow.buyIn,
    chips_per_player: gameRow.chipsPerPlayer,
    location: gameRow.location,
    finished: gameRow.finished,
    players: playerRows,
  };
}

function toGameResponse(g: GameWithPlayers) {
  return {
    id: g.id,
    date: g.date,
    buy_in: g.buy_in,
    chips_per_player: g.chips_per_player,
    location: g.location,
    finished: g.finished,
    players: g.players.map((p) => ({
      player_id: p.player_id,
      name: p.name,
      initial_chips: p.initial_chips,
      final_chips: p.final_chips,
    })),
  };
}

export default app;
export { getGameWithPlayers };
