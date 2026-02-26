import { Hono } from "hono";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import * as R from "remeda";
import { db } from "../db";
import {
  ApiProfitLossSchema,
  games,
  gamePlayers,
  players,
  PeriodFilterSchema,
  type PeriodFilter,
} from "@poker-hub/db";

const app = new Hono();

function parsePeriod(value: string | undefined): PeriodFilter {
  const parsed = PeriodFilterSchema.safeParse(value);
  return parsed.success ? parsed.data : "all_time";
}

function getStartDate(
  period: PeriodFilter,
  startDateQuery?: string,
): string | null {
  const now = new Date();
  switch (period) {
    case "last_7_days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case "last_month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }
    case "last_year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString();
    }
    case "all_time":
      return null;
    case "custom":
      return startDateQuery ?? null;
    default:
      return null;
  }
}

function getEndDate(period: PeriodFilter, endDateQuery?: string): string | null {
  if (period === "custom" && endDateQuery) return endDateQuery;
  return new Date().toISOString();
}

app.get("/", (c) => {
  const period = parsePeriod(c.req.query("period"));
  const startDate = getStartDate(
    period,
    c.req.query("startDate") ?? c.req.query("start_date") ?? undefined,
  );
  const endDate = getEndDate(
    period,
    c.req.query("endDate") ?? c.req.query("end_date") ?? undefined,
  );

  const finishedCondition = eq(games.finished, true);
  const where =
    startDate && endDate
      ? and(
          finishedCondition,
          gte(games.date, startDate),
          lte(games.date, endDate),
        )
      : startDate
        ? and(finishedCondition, gte(games.date, startDate))
        : finishedCondition;

  const gameRows = db
    .select({ id: games.id, date: games.date, buyIn: games.buyIn })
    .from(games)
    .where(where)
    .orderBy(games.date)
    .all();

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

    const totalChips = R.sumBy(participants, (p) => p.finalChips ?? 0);
    if (totalChips === 0) continue;

    const numPlayers = participants.length;
    const totalPool = game.buyIn * numPlayers;

    R.forEach(participants, (p) => {
      const payout = ((p.finalChips ?? 0) / totalChips) * totalPool;
      const entry = byPlayer.get(p.playerId);
      const name = entry?.name ?? p.name;
      const totalIn = (entry?.totalIn ?? 0) + game.buyIn;
      const totalOut = (entry?.totalOut ?? 0) + payout;
      byPlayer.set(p.playerId, { name, totalIn, totalOut });
    });
  }

  const playersList = R.pipe(
    byPlayer.entries(),
    (entries) => Array.from(entries),
    R.map(([playerId, { name, totalIn, totalOut }]) => ({
      id: playerId,
      name,
      totalBuyIn: totalIn,
      totalCashOut: totalOut,
      profitLoss: totalOut - totalIn,
    })),
  );

  const response = ApiProfitLossSchema.parse({
    period,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    players: playersList,
  });

  return c.json(response);
});

export default app;
