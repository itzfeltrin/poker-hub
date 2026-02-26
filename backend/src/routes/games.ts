import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ApiGameSchema,
  ApiGameWithPlayersSchema,
  FinalizeGameBodySchema,
  gamePlayers,
  games,
  players,
} from "@poker-hub/db";
import type { ApiGameWithPlayers } from "@poker-hub/db";
import * as R from "remeda";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json();
  const apiGame = ApiGameSchema.safeParse(body);
  if (!apiGame.success) {
    return c.json({ error: apiGame.error.issues[0]?.message }, 400);
  }

  db.insert(games).values(apiGame.data).run();
  R.forEach(apiGame.data.playerIds, (playerId) => {
    const { id: gameId, chipsPerPlayer } = apiGame.data;
    db.insert(gamePlayers)
      .values({
        gameId,
        playerId,
        initialChips: chipsPerPlayer,
        finalChips: null,
      })
      .run();
  });

  return c.json(apiGame.data, 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const game = getGameWithPlayers(id);
  if (!game) return c.json({ error: "Game not found" }, 404);
  return c.json(toGameResponse(game));
});

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

  const body = await c.req.json();
  const parsed = FinalizeGameBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid finalChips" },
      400,
    );
  }
  const { finalChips } = parsed.data;

  const participants = db
    .select({ playerId: gamePlayers.playerId })
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  const missingOrInvalid = R.find(
    participants,
    ({ playerId }) =>
      typeof finalChips[playerId] !== "number" || finalChips[playerId] < 0,
  );
  if (missingOrInvalid) {
    return c.json(
      {
        error: `Invalid finalChips for player ${missingOrInvalid.playerId}. Must be a number >= 0`,
      },
      400,
    );
  }

  R.forEach(participants, ({ playerId }) => {
    db.update(gamePlayers)
      .set({ finalChips: finalChips[playerId] })
      .where(
        and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.playerId, playerId)),
      )
      .run();
  });

  db.update(games).set({ finished: true }).where(eq(games.id, gameId)).run();
  const updated = getGameWithPlayers(gameId);
  if (!updated) return c.json({ error: "Failed to finalize" }, 500);
  return c.json(toGameResponse(updated));
});

function getGameWithPlayers(gameId: string): ApiGameWithPlayers | null {
  const gameRow = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!gameRow) return null;

  const playerRows = db
    .select({
      id: players.id,
      name: players.name,
      initialChips: gamePlayers.initialChips,
      finalChips: gamePlayers.finalChips,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  const parsed = ApiGameWithPlayersSchema.safeParse({
    ...gameRow,
    players: playerRows,
  });
  return parsed.success ? parsed.data : null;
}

function toGameResponse(g: ApiGameWithPlayers) {
  return {
    id: g.id,
    date: g.date,
    buyIn: g.buyIn,
    chipsPerPlayer: g.chipsPerPlayer,
    location: g.location,
    finished: g.finished,
    players: R.map(g.players, (p) => ({
      id: p.id,
      name: p.name,
      initialChips: p.initialChips,
      finalChips: p.finalChips,
    })),
  };
}

export default app;
export { getGameWithPlayers };
