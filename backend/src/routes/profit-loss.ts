import { Hono } from "hono";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { pipe } from "remeda";
import { db } from "../db";
import { games, gamePlayers, players } from "@poker-hub/db";
import { type ProfitLoss, PeriodFilter } from "../types";

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
        c.req.query("startDate") ?? c.req.query("start_date"),
        c.req.query("endDate") ?? c.req.query("end_date"),
      ),
      endDate: getEndDate(
        period,
        c.req.query("endDate") ?? c.req.query("end_date"),
      ),
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
    { name: string; totalIn: number; totalOut: number }
  >();

  for (const game of gameRows) {
    const participants = db
      .select({
        playerId: gamePlayers.playerId,
        name: players.name,
        finalChips: gamePlayers.finalChips,
      })
      .from(gamePlayers)
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .where(
        and(eq(gamePlayers.gameId, game.id), isNotNull(gamePlayers.finalChips)),
      )
      .all();

    const totalChips = participants.reduce(
      (s, p) => s + (p.finalChips ?? 0),
      0,
    );
    if (totalChips === 0) continue;

    const numPlayers = participants.length;
    const totalPool = game.buyIn * numPlayers;

    for (const p of participants) {
      const payout = ((p.finalChips ?? 0) / totalChips) * totalPool;
      const entry = byPlayer.get(p.playerId);
      const name = entry?.name ?? p.name;
      const totalIn = (entry?.totalIn ?? 0) + game.buyIn;
      const totalOut = (entry?.totalOut ?? 0) + payout;
      byPlayer.set(p.playerId, { name, totalIn, totalOut });
    }
  }

  const result: ProfitLoss[] = Array.from(byPlayer.entries()).map(
    ([playerId, { name, totalIn, totalOut }]) => ({
      playerId,
      name,
      totalIn,
      totalOut,
      profitLoss: totalOut - totalIn,
    }),
  );

  return c.json({
    period,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    players: result.map((r) => ({
      playerId: r.playerId,
      name: r.name,
      totalBuyIn: r.totalIn,
      totalCashOut: r.totalOut,
      profitLoss: r.profitLoss,
    })),
  });
});

export default app;
