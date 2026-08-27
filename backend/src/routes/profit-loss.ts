import { Hono } from "hono";
import { and, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import * as R from "remeda";
import { z } from "zod/v4";
import { db } from "../db";
import {
  ApiProfitLossSchema,
  games,
  gamePlayerBuyIns,
  gamePlayers,
  groupMembers,
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

  const groupFilterParsed = z.uuid().safeParse(c.req.query("groupId"));

  const finishedCondition = and(eq(games.finished, true), isNull(games.deletedAt));
  const dateWhere =
    startDate && endDate
      ? and(
          finishedCondition,
          gte(games.date, startDate),
          lte(games.date, endDate),
        )
      : startDate
        ? and(finishedCondition, gte(games.date, startDate))
        : finishedCondition;

  const where = groupFilterParsed.success
    ? and(dateWhere, eq(games.groupId, groupFilterParsed.data))
    : dateWhere;

  const gameRows = db
    .select({
      id: games.id,
      date: games.date,
      buyIn: games.buyIn,
      chipsPerPlayer: games.chipsPerPlayer,
    })
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
        playerId: groupMembers.playerId,
        name: players.name,
        cashOut: gamePlayers.cashOut,
      })
      .from(gamePlayers)
      .innerJoin(
        groupMembers,
        eq(gamePlayers.groupMemberId, groupMembers.id),
      )
      .innerJoin(players, eq(players.id, groupMembers.playerId))
      .where(
        and(eq(gamePlayers.gameId, game.id), isNotNull(gamePlayers.cashOut)),
      )
      .all();

    const totalChips = R.sumBy(participants, (p) => p.cashOut ?? 0);
    if (totalChips === 0) continue;

    const buyInRows = db
      .select({
        playerId: groupMembers.playerId,
        chips: gamePlayerBuyIns.chips,
      })
      .from(gamePlayerBuyIns)
      .innerJoin(
        groupMembers,
        eq(gamePlayerBuyIns.groupMemberId, groupMembers.id),
      )
      .where(eq(gamePlayerBuyIns.gameId, game.id))
      .all();

    const buyInsByPlayer = R.groupBy(buyInRows, (b) => b.playerId);
    const totalBuyInChips = R.sumBy(buyInRows, (b) => b.chips);

    const totalPool =
      game.chipsPerPlayer > 0
        ? (totalBuyInChips / game.chipsPerPlayer) * game.buyIn
        : game.buyIn * participants.length;

    R.forEach(participants, (p) => {
      const payout = ((p.cashOut ?? 0) / totalChips) * totalPool;
      const entry = byPlayer.get(p.playerId);
      const name = entry?.name ?? p.name;
      const playerBuyInChips = R.sumBy(
        buyInsByPlayer[p.playerId] ?? [],
        (b) => b.chips,
      );
      const totalIn =
        (entry?.totalIn ?? 0) +
        (game.chipsPerPlayer > 0
          ? (playerBuyInChips / game.chipsPerPlayer) * game.buyIn
          : game.buyIn);
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
    groupId: groupFilterParsed.success ? groupFilterParsed.data : null,
    players: playersList,
  });

  return c.json(response);
});

export default app;
