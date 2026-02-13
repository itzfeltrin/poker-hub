import { Hono } from "hono";
import { db } from "../db";
import type { PartidaComJogadores } from "../types";

const app = new Hono();

type CriarPartidaBody = {
  buy_in: number;
  chips_por_jogador: number;
  jogador_ids: string[];
};

// Criar nova partida
app.post("/", async (c) => {
  const body = await c.req.json<CriarPartidaBody>();
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
  const data = new Date().toISOString();

  db.run(
    "INSERT INTO partidas (id, data, buy_in, chips_por_jogador, finalizada) VALUES (?, ?, ?, ?, 0)",
    [id, data, buy_in, chips_por_jogador]
  );

  for (const jogador_id of jogador_ids) {
    db.run(
      "INSERT INTO partida_jogadores (partida_id, jogador_id, chips_iniciais, chips_finais) VALUES (?, ?, ?, NULL)",
      [id, jogador_id, chips_por_jogador]
    );
  }

  const partida = getPartidaComJogadores(id);
  return c.json(partida, 201);
});

// Obter uma partida por id
app.get("/:id", (c) => {
  const id = c.req.param("id");
  const partida = getPartidaComJogadores(id);
  if (!partida) return c.json({ erro: "Partida não encontrada" }, 404);
  return c.json(partida);
});

// Finalizar partida: enviar chips_finais por jogador
type FinalizarPartidaBody = {
  chips_finais: Record<string, number>; // jogador_id -> chips_finais
};

app.patch("/:id/finalizar", async (c) => {
  const partidaId = c.req.param("id");
  const partida = db
    .query<{ finalizada: number }>("SELECT finalizada FROM partidas WHERE id = ?")
    .get(partidaId);
  if (!partida) return c.json({ erro: "Partida não encontrada" }, 404);
  if (partida.finalizada) return c.json({ erro: "Partida já está finalizada" }, 400);

  const body = await c.req.json<FinalizarPartidaBody>();
  const chips_finais = body.chips_finais;
  if (!chips_finais || typeof chips_finais !== "object") {
    return c.json({ erro: "chips_finais deve ser um objeto { jogador_id: chips }" }, 400);
  }

  const participantes = db
    .query<{ jogador_id: string }>("SELECT jogador_id FROM partida_jogadores WHERE partida_id = ?")
    .all(partidaId);

  for (const { jogador_id } of participantes) {
    const cf = chips_finais[jogador_id];
    if (typeof cf !== "number" || cf < 0) {
      return c.json(
        { erro: `chips_finais inválido para jogador ${jogador_id}. Deve ser número >= 0` },
        400
      );
    }
    db.run(
      "UPDATE partida_jogadores SET chips_finais = ? WHERE partida_id = ? AND jogador_id = ?",
      [cf, partidaId, jogador_id]
    );
  }

  db.run("UPDATE partidas SET finalizada = 1 WHERE id = ?", [partidaId]);
  const atualizada = getPartidaComJogadores(partidaId);
  return c.json(atualizada);
});

function getPartidaComJogadores(partidaId: string): PartidaComJogadores | null {
  const partida = db
    .query<{
      id: string;
      data: string;
      buy_in: number;
      chips_por_jogador: number;
      finalizada: number;
    }>("SELECT id, data, buy_in, chips_por_jogador, finalizada FROM partidas WHERE id = ?")
    .get(partidaId) as any;
  if (!partida) return null;

  const jogadores = db
    .query<{ jogador_id: string; nome: string; chips_iniciais: number; chips_finais: number | null }>(
      `SELECT pj.jogador_id, j.nome, pj.chips_iniciais, pj.chips_finais
       FROM partida_jogadores pj
       JOIN jogadores j ON j.id = pj.jogador_id
       WHERE pj.partida_id = ?`
    )
    .all(partidaId);

  return {
    ...partida,
    finalizada: Boolean(partida.finalizada),
    jogadores,
  };
}

export default app;
export { getPartidaComJogadores };
