import { Hono } from "hono";
import { db } from "../db";
import type { PartidaComJogadores } from "../types";

const app = new Hono();

type PartidaRow = {
  id: string;
  data: string;
  buy_in: number;
  chips_por_jogador: number;
  finalizada: number;
};

// Listar todo o histórico de partidas (mais recentes primeiro)
app.get("/", (c) => {
  const partidas = db
    .query<PartidaRow>(
      "SELECT id, data, buy_in, chips_por_jogador, finalizada FROM partidas ORDER BY data DESC"
    )
    .all();

  const resultado: PartidaComJogadores[] = partidas.map((p) => {
    const jogadores = db
      .query<{
        jogador_id: string;
        nome: string;
        chips_iniciais: number;
        chips_finais: number | null;
      }>(
        `SELECT pj.jogador_id, j.nome, pj.chips_iniciais, pj.chips_finais
         FROM partida_jogadores pj
         JOIN jogadores j ON j.id = pj.jogador_id
         WHERE pj.partida_id = ?`
      )
      .all(p.id);
    return {
      ...p,
      finalizada: Boolean(p.finalizada),
      jogadores,
    };
  });

  return c.json(resultado);
});

export default app;
