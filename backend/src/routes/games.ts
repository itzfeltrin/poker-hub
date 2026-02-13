import { Hono } from "hono";
import { db } from "../db";
import type { GameWithPlayers } from "../types";

const app = new Hono();

type CreateGameBody = {
  buy_in: number;
  chips_por_jogador: number;
  jogador_ids: string[];
};

app.post("/", async (c) => {
  const body = await c.req.json<CreateGameBody>();
  const { buy_in, chips_por_jogador, jogador_ids } = body;

  if (typeof buy_in !== "number" || buy_in <= 0) {
    return c.json({ erro: "buy_in deve ser um número positivo" }, 400);
  }
  if (typeof chips_por_jogador !== "number" || chips_por_jogador <= 0) {
    return c.json({ erro: "chips_por_jogador deve ser um número positivo" }, 400);
  }
  if (!Array.isArray(jogador_ids) || jogador_ids.length === 0) {
    return c.json({ erro: "jogador_ids deve ser um array não vazio de IDs de jogadores" }, 400);
  }

  const id = crypto.randomUUID();
  const date = new Date().toISOString();

  db.run(
    "INSERT INTO games (id, date, buy_in, chips_per_player, finished) VALUES (?, ?, ?, ?, 0)",
    [id, date, buy_in, chips_por_jogador]
  );

  for (const playerId of jogador_ids) {
    db.run(
      "INSERT INTO game_players (game_id, player_id, initial_chips, final_chips) VALUES (?, ?, ?, NULL)",
      [id, playerId, chips_por_jogador]
    );
  }

  const game = getGameWithPlayers(id);
  if (!game) return c.json({ erro: "Erro ao criar partida" }, 500);
  return c.json(toGameResponse(game), 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const game = getGameWithPlayers(id);
  if (!game) return c.json({ erro: "Partida não encontrada" }, 404);
  return c.json(toGameResponse(game));
});

type FinalizeGameBody = {
  chips_finais: Record<string, number>;
};

app.patch("/:id/finalizar", async (c) => {
  const gameId = c.req.param("id");
  const game = db
    .query<{ finished: number }, [string]>("SELECT finished FROM games WHERE id = ?")
    .get(gameId);
  if (!game) return c.json({ erro: "Partida não encontrada" }, 404);
  if (game.finished) return c.json({ erro: "Partida já está finalizada" }, 400);

  const body = await c.req.json<FinalizeGameBody>();
  const finalChips = body.chips_finais;
  if (!finalChips || typeof finalChips !== "object") {
    return c.json({ erro: "chips_finais deve ser um objeto { jogador_id: chips }" }, 400);
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
        { erro: `chips_finais inválido para jogador ${player_id}. Deve ser número >= 0` },
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
  if (!updated) return c.json({ erro: "Erro ao finalizar" }, 500);
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
    data: g.date,
    buy_in: g.buy_in,
    chips_por_jogador: g.chips_per_player,
    finalizada: g.finished,
    jogadores: g.players.map((p) => ({
      jogador_id: p.player_id,
      nome: p.name,
      chips_iniciais: p.initial_chips,
      chips_finais: p.final_chips,
    })),
  };
}

export default app;
export { getGameWithPlayers };
