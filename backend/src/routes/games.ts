import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ApiGameSchema,
  ApiGameBuyInCreateSchema,
  ApiGameWithPlayersSchema,
  FinalizeGameBodySchema,
  gamePlayerBuyIns,
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

  const gameData = apiGame.data;

  db.insert(games).values(gameData).run();
  R.forEach(gameData.playerIds, (playerId) => {
    const { id: gameId, chipsPerPlayer } = gameData;
    db.insert(gamePlayers)
      .values({
        gameId,
        playerId,
      })
      .run();

    db.insert(gamePlayerBuyIns)
      .values({
        gameId,
        playerId,
        chips: chipsPerPlayer,
        isInitial: true,
      })
      .run();
  });

  return c.json(gameData, 201);
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
      { error: parsed.error.issues[0]?.message ?? "Invalid cashOut" },
      400,
    );
  }
  const { cashOut } = parsed.data;

  const participants = db
    .select({ playerId: gamePlayers.playerId })
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  const missingOrInvalid = R.find(
    participants,
    ({ playerId }) =>
      typeof cashOut[playerId] !== "number" || cashOut[playerId] < 0,
  );
  if (missingOrInvalid) {
    return c.json(
      {
        error: `Invalid cashOut for player ${missingOrInvalid.playerId}. Must be a number >= 0`,
      },
      400,
    );
  }

  R.forEach(participants, ({ playerId }) => {
    db.update(gamePlayers)
      .set({ cashOut: cashOut[playerId] })
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

app.post("/:id/buy-ins", async (c) => {
  const gameId = c.req.param("id");

  const gameRow = db
    .select({
      id: games.id,
      finished: games.finished,
      chipsPerPlayer: games.chipsPerPlayer,
    })
    .from(games)
    .where(eq(games.id, gameId))
    .get();

  if (!gameRow) return c.json({ error: "Game not found" }, 404);
  if (gameRow.finished)
    return c.json({ error: "Game is already finalized" }, 400);

  const body = await c.req.json();
  const parsed = ApiGameBuyInCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid buy-in payload" },
      400,
    );
  }

  const { playerId, chips } = parsed.data;

  const participant = db
    .select({ playerId: gamePlayers.playerId })
    .from(gamePlayers)
    .where(
      and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.playerId, playerId)),
    )
    .get();

  if (!participant) {
    return c.json(
      { error: "Player is not registered in this game" },
      404,
    );
  }

  const buyInChips = chips ?? gameRow.chipsPerPlayer;

  db.insert(gamePlayerBuyIns)
    .values({
      gameId,
      playerId,
      chips: buyInChips,
      isInitial: false,
    })
    .run();

  return c.json({ ok: true }, 201);
});

function getGameWithPlayers(gameId: string): ApiGameWithPlayers | null {
  const gameRow = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!gameRow) return null;

  const participants = db
    .select({
      playerId: gamePlayers.playerId,
      name: players.name,
      cashOut: gamePlayers.cashOut,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  const buyInRows = db
    .select({
      playerId: gamePlayerBuyIns.playerId,
      chips: gamePlayerBuyIns.chips,
    })
    .from(gamePlayerBuyIns)
    .where(eq(gamePlayerBuyIns.gameId, gameId))
    .all();

  const buyInsByPlayer = R.groupBy(buyInRows, (b) => b.playerId);

  const playerRows = R.pipe(
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
    locationId: g.locationId,
    finished: g.finished,
    players: R.map(g.players, (p) => ({
      id: p.id,
      name: p.name,
      initialChips: p.initialChips,
      cashOut: p.cashOut,
    })),
  };
}

export default app;
export { getGameWithPlayers };
