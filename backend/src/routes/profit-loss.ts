import { Hono } from "hono";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { pipe } from "remeda";
import { db } from "../db";
import { games, gamePlayers, players } from "../db/schema";
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
  _endDateQuery?: string,
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

function getEndDate(
  period: PeriodFilter,
  endDateQuery?: string,
): string | null {
  if (period === PeriodFilter.Custom && endDateQuery) return endDateQuery;
  return new Date().toISOString();
}

app.get("/", (c) => {
  const { period, startDate, endDate } = pipe(
    c.req.query("period"),
    parsePeriod,
    (period) => ({
      period,
      startDate: getStartDate(
        period,
        c.req.query("start_date"),
        c.req.query("end_date"),
      ),
      endDate: getEndDate(period, c.req.query("end_date")),
    }),
  );

  let gameRows: { id: string; date: string; buyIn: number }[];
  const finishedCondition = eq(games.finished, true);

  if (startDate && endDate) {
    gameRows = db
      .select({ id: games.id, date: games.date, buyIn: games.buyIn })
      .from(games)
      .where(
        and(
          finishedCondition,
          gte(games.date, startDate),
          lte(games.date, endDate),
        ),
      )
      .orderBy(games.date)
      .all();
  } else if (startDate) {
    gameRows = db
      .select({ id: games.id, date: games.date, buyIn: games.buyIn })
      .from(games)
      .where(and(finishedCondition, gte(games.date, startDate)))
      .orderBy(games.date)
      .all();
  } else {
    gameRows = db
      .select({ id: games.id, date: games.date, buyIn: games.buyIn })
      .from(games)
      .where(finishedCondition)
      .orderBy(games.date)
      .all();
  }

  const byPlayer = new Map<
    string,
    { name: string; total_in: number; total_out: number }
  >();

  for (const game of gameRows) {
    const participants = db
      .select({
        player_id: gamePlayers.playerId,
        name: players.name,
        final_chips: gamePlayers.finalChips,
      })
      .from(gamePlayers)
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .where(
        and(eq(gamePlayers.gameId, game.id), isNotNull(gamePlayers.finalChips)),
      )
      .all();

    const totalChips = participants.reduce(
      (s, p) => s + (p.final_chips ?? 0),
      0,
    );
    if (totalChips === 0) continue;

    const numPlayers = participants.length;
    const totalPool = game.buyIn * numPlayers;

    for (const p of participants) {
      const payout = ((p.final_chips ?? 0) / totalChips) * totalPool;
      const entry = byPlayer.get(p.player_id);
      const name = entry?.name ?? p.name;
      const total_in = (entry?.total_in ?? 0) + game.buyIn;
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
    }),
  );

  return c.json({
    period,
    start_date: startDate ?? undefined,
    end_date: endDate ?? undefined,
    players: result.map((r) => ({
      player_id: r.player_id,
      name: r.name,
      total_buy_in: r.total_in,
      total_cash_out: r.total_out,
      profit_loss: r.profit_loss,
    })),
  });
});

export default app;
