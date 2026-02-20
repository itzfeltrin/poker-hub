import { Hono } from "hono";
import { db } from "../db";
import type { GameWithPlayers } from "../types";

const app = new Hono();

type CreateGameBody = {
  buy_in: number;
  chips_per_player: number;
  player_ids: string[];
};

app.post("/", async (c) => {
  const body = await c.req.json<CreateGameBody>();
  const { buy_in, chips_per_player, player_ids } = body;

  if (typeof buy_in !== "number" || buy_in <= 0) {
    return c.json({ error: "buy_in must be a positive number" }, 400);
  }
  if (typeof chips_per_player !== "number" || chips_per_player <= 0) {
    return c.json({ error: "chips_per_player must be a positive number" }, 400);
  }
  if (!Array.isArray(player_ids) || player_ids.length === 0) {
    return c.json({ error: "player_ids must be a non-empty array of player IDs" }, 400);
  }

  const id = crypto.randomUUID();
  const date = new Date().toISOString();

  db.run(
    "INSERT INTO games (id, date, buy_in, chips_per_player, finished) VALUES (?, ?, ?, ?, 0)",
    [id, date, buy_in, chips_per_player]
  );

  for (const playerId of player_ids) {
    db.run(
      "INSERT INTO game_players (game_id, player_id, initial_chips, final_chips) VALUES (?, ?, ?, NULL)",
      [id, playerId, chips_per_player]
    );
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
  const game = db
    .query<{ finished: number }, [string]>("SELECT finished FROM games WHERE id = ?")
    .get(gameId);
  if (!game) return c.json({ error: "Game not found" }, 404);
  if (game.finished) return c.json({ error: "Game is already finalized" }, 400);

  const body = await c.req.json<FinalizeGameBody>();
  const finalChips = body.final_chips;
  if (!finalChips || typeof finalChips !== "object") {
    return c.json({ error: "final_chips must be an object { player_id: chips }" }, 400);
  }

  const participants = db
    .query<{ player_id: string }, [string]>(
      "SELECT player_id FROM game_players WHERE game_id = ?"
    )
    .all(gameId);

  for (const { player_id } of participants) {
    const chips = finalChips[player_id];
    if (typeof chips !== "number" || chips < 0) {
      return c.json(
        { error: `Invalid final_chips for player ${player_id}. Must be a number >= 0` },
        400
      );
    }
    db.run(
      "UPDATE game_players SET final_chips = ? WHERE game_id = ? AND player_id = ?",
      [chips, gameId, player_id]
    );
  }

  db.run("UPDATE games SET finished = 1 WHERE id = ?", [gameId]);
  const updated = getGameWithPlayers(gameId);
  if (!updated) return c.json({ error: "Failed to finalize" }, 500);
  return c.json(toGameResponse(updated));
});

function getGameWithPlayers(gameId: string): GameWithPlayers | null {
  const game = db
    .query<
      { id: string; date: string; buy_in: number; chips_per_player: number; finished: number },
      [string]
    >("SELECT id, date, buy_in, chips_per_player, finished FROM games WHERE id = ?")
    .get(gameId);
  if (!game) return null;

  const players = db
    .query<
      { player_id: string; name: string; initial_chips: number; final_chips: number | null },
      [string]
    >(
      `SELECT gp.player_id, p.name, gp.initial_chips, gp.final_chips
       FROM game_players gp
       JOIN players p ON p.id = gp.player_id
       WHERE gp.game_id = ?`
    )
    .all(gameId);

  return {
    ...game,
    finished: Boolean(game.finished),
    players,
  };
}

function toGameResponse(g: GameWithPlayers) {
  return {
    id: g.id,
    date: g.date,
    buy_in: g.buy_in,
    chips_per_player: g.chips_per_player,
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
