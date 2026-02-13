import { Hono } from "hono";
import { db } from "../db";
import type { LucroPerda } from "../types";
import { PeriodoFiltro } from "../types";

const app = new Hono();

const PERIODO_VALORES = Object.values(PeriodoFiltro);

function parsePeriodo(value: string | undefined): PeriodoFiltro {
  if (value && PERIODO_VALORES.includes(value as PeriodoFiltro)) {
    return value as PeriodoFiltro;
  }
  return PeriodoFiltro.TodoPeriodo;
}

function getDataInicio(
  periodo: PeriodoFiltro,
  dataInicio?: string,
  _dataFim?: string
): string | null {
  const now = new Date();
  switch (periodo) {
    case PeriodoFiltro.Ultimos7Dias: {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case PeriodoFiltro.UltimoMes: {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }
    case PeriodoFiltro.UltimoAno: {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString();
    }
    case PeriodoFiltro.TodoPeriodo:
      return null;
    case PeriodoFiltro.Personalizado:
      return dataInicio || null;
    default:
      return null;
  }
}

function getDataFim(periodo: PeriodoFiltro, dataFim?: string): string | null {
  if (periodo === PeriodoFiltro.Personalizado && dataFim) return dataFim;
  return new Date().toISOString();
}

// GET /lucros-perdas?periodo=ultimos_7_dias|ultimo_mes|ultimo_ano|todo_periodo|personalizado
// Se periodo=personalizado: data_inicio=ISO e data_fim=ISO
app.get("/", (c) => {
  const periodo = parsePeriodo(c.req.query("periodo"));
  const dataInicioQuery = c.req.query("data_inicio");
  const dataFimQuery = c.req.query("data_fim");

  const dataInicio = getDataInicio(periodo, dataInicioQuery, dataFimQuery);
  const dataFim = getDataFim(periodo, dataFimQuery);

  // Partidas finalizadas no período
  let partidas: Array<{ id: string; data: string; buy_in: number }>;
  const partidaRow = { id: "", data: "", buy_in: 0 };
  type PartidaRow = typeof partidaRow;
  if (dataInicio && dataFim) {
    partidas = db
      .query<PartidaRow, [string, string]>(
        "SELECT id, data, buy_in FROM partidas WHERE finalizada = 1 AND data >= ? AND data <= ? ORDER BY data"
      )
      .all(dataInicio, dataFim);
  } else if (dataInicio) {
    partidas = db
      .query<PartidaRow, [string]>(
        "SELECT id, data, buy_in FROM partidas WHERE finalizada = 1 AND data >= ? ORDER BY data"
      )
      .all(dataInicio);
  } else {
    partidas = db
      .query<PartidaRow, []>(
        "SELECT id, data, buy_in FROM partidas WHERE finalizada = 1 ORDER BY data"
      )
      .all();
  }

  // Por partida: total_pool = buy_in * num_players; por jogador: payout = (chips_finais / total_chips) * total_pool; lucro = payout - buy_in
  const porJogador = new Map<
    string,
    { nome: string; total_entrada: number; total_saida: number }
  >();

  for (const partida of partidas) {
    const participantes = db
      .query<
        { jogador_id: string; nome: string; chips_finais: number },
        [string]
      >(
        `SELECT pj.jogador_id, j.nome, pj.chips_finais
         FROM partida_jogadores pj
         JOIN jogadores j ON j.id = pj.jogador_id
         WHERE pj.partida_id = ? AND pj.chips_finais IS NOT NULL`
      )
      .all(partida.id);

    const totalChips = participantes.reduce((s, p) => s + p.chips_finais, 0);
    if (totalChips === 0) continue;

    const numPlayers = participantes.length;
    const totalPool = partida.buy_in * numPlayers;

    for (const p of participantes) {
      const payout = (p.chips_finais / totalChips) * totalPool;
      const entry = porJogador.get(p.jogador_id);
      const nome = entry?.nome ?? p.nome;
      const total_entrada = (entry?.total_entrada ?? 0) + partida.buy_in;
      const total_saida = (entry?.total_saida ?? 0) + payout;
      porJogador.set(p.jogador_id, { nome, total_entrada, total_saida });
    }
  }

  const resultado: LucroPerda[] = Array.from(porJogador.entries()).map(
    ([jogador_id, { nome, total_entrada, total_saida }]) => ({
      jogador_id,
      nome,
      total_entrada,
      total_saida,
      lucro_perda: total_saida - total_entrada,
    })
  );

  return c.json({
    periodo,
    data_inicio: dataInicio ?? undefined,
    data_fim: dataFim ?? undefined,
    jogadores: resultado,
  });
});

export default app;
