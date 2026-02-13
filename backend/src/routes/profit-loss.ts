import { Hono } from "hono";
import { pipe } from "remeda";
import { db } from "../db";
import type { ProfitLoss } from "../types";
import { PeriodFilter } from "../types";

const app = new Hono();

const PERIOD_VALUES = Object.values(PeriodFilter);

function parsePeriod(value: string | undefined): PeriodFilter {
  if (value && PERIOD_VALUES.includes(value as PeriodFilter)) {
    return value as PeriodFilter;
  }
  return PeriodFilter.AllTime;
}

function getStartDate(
  period: PeriodFilter,
  startDateQuery?: string,
  _endDateQuery?: string
): string | null {
  const now = new Date();
  switch (period) {
    case PeriodFilter.Last7Days: {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case PeriodFilter.LastMonth: {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }
    case PeriodFilter.LastYear: {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString();
    }
    case PeriodFilter.AllTime:
      return null;
    case PeriodFilter.Custom:
      return startDateQuery || null;
    default:
      return null;
  }
}

function getEndDate(period: PeriodFilter, endDateQuery?: string): string | null {
  if (period === PeriodFilter.Custom && endDateQuery) return endDateQuery;
  return new Date().toISOString();
}

type PartidaRow = { id: string; date: string; buy_in: number };

// GET /lucros-perdas?periodo=ultimos_7_dias|ultimo_mes|ultimo_ano|todo_periodo|personalizado
// For periodo=personalizado: data_inicio=ISO and data_fim=ISO
app.get("/", (c) => {
  const { period, startDate, endDate } = pipe(
    c.req.query("periodo"),
    parsePeriod,
    (period) => ({
      period,
      startDate: getStartDate(period, c.req.query("data_inicio"), c.req.query("data_fim")),
      endDate: getEndDate(period, c.req.query("data_fim")),
    })
  );

  let games: PartidaRow[];
  if (startDate && endDate) {
    games = db
      .query<PartidaRow, [string, string]>(
        "SELECT id, date, buy_in FROM games WHERE finished = 1 AND date >= ? AND date <= ? ORDER BY date"
      )
      .all(startDate, endDate);
  } else if (startDate) {
    games = db
      .query<PartidaRow, [string]>(
        "SELECT id, date, buy_in FROM games WHERE finished = 1 AND date >= ? ORDER BY date"
      )
      .all(startDate);
  } else {
    games = db
      .query<PartidaRow, []>(
        "SELECT id, date, buy_in FROM games WHERE finished = 1 ORDER BY date"
      )
      .all();
  }

  const byPlayer = new Map<
    string,
    { name: string; total_in: number; total_out: number }
  >();

  for (const game of games) {
    const participants = db
      .query<
        { player_id: string; name: string; final_chips: number },
        [string]
      >(
        `SELECT gp.player_id, p.name, gp.final_chips
         FROM game_players gp
         JOIN players p ON p.id = gp.player_id
         WHERE gp.game_id = ? AND gp.final_chips IS NOT NULL`
      )
      .all(game.id);

    const totalChips = participants.reduce((s, p) => s + p.final_chips, 0);
    if (totalChips === 0) continue;

    const numPlayers = participants.length;
    const totalPool = game.buy_in * numPlayers;

    for (const p of participants) {
      const payout = (p.final_chips / totalChips) * totalPool;
      const entry = byPlayer.get(p.player_id);
      const name = entry?.name ?? p.name;
      const total_in = (entry?.total_in ?? 0) + game.buy_in;
      const total_out = (entry?.total_out ?? 0) + payout;
      byPlayer.set(p.player_id, { name, total_in, total_out });
    }
  }

  const result: ProfitLoss[] = Array.from(byPlayer.entries()).map(
    ([player_id, { name, total_in, total_out }]) => ({
      player_id,
      name,
      total_in,
      total_out,
      profit_loss: total_out - total_in,
    })
  );

  return c.json({
    periodo: period,
    data_inicio: startDate ?? undefined,
    data_fim: endDate ?? undefined,
    jogadores: result.map((r) => ({
      jogador_id: r.player_id,
      nome: r.name,
      total_entrada: r.total_in,
      total_saida: r.total_out,
      lucro_perda: r.profit_loss,
    })),
  });
});

export default app;
