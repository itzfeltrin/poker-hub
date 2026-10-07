import { Hono } from "hono";
import { and, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import * as R from "remeda";
import { z } from "zod/v4";
import { db } from "../db";
import {
  ApiProfitLossSchema,
  ApiProfitLossSeriesSchema,
  games,
  gamePlayerBuyIns,
  gamePlayers,
  groupMembers,
  players,
  PeriodFilterSchema,
  type PeriodFilter,
} from "@poker-hub/db";
import { getChampionship } from "../championships";

const app = new Hono();

type GameRow = {
  id: string;
  date: string;
  buyIn: number;
  chipsPerPlayer: number;
};

type PlayerGamePnL = {
  playerId: string;
  name: string;
  buyIn: number;
  cashOut: number;
  profitLoss: number;
};

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

function resolveFilters(c: {
  req: {
    query: (name: string) => string | undefined;
  };
}):
  | {
      ok: true;
      period: PeriodFilter;
      startDate: string | null;
      endDate: string | null;
      groupId: string | undefined;
      championshipId: string | undefined;
      playerId: string | undefined;
    }
  | { ok: false; status: 400 | 404; error: string } {
  const championshipIdParsed = z.uuid().safeParse(c.req.query("championshipId"));
  const groupFilterParsed = z.uuid().safeParse(c.req.query("groupId"));
  const playerIdParsed = z.uuid().safeParse(c.req.query("playerId"));

  const period = parsePeriod(c.req.query("period"));
  const startDate = getStartDate(
    period,
    c.req.query("startDate") ?? c.req.query("start_date") ?? undefined,
  );
  const endDate = getEndDate(
    period,
    c.req.query("endDate") ?? c.req.query("end_date") ?? undefined,
  );
  const groupId = groupFilterParsed.success ? groupFilterParsed.data : undefined;
  const championshipId = championshipIdParsed.success
    ? championshipIdParsed.data
    : undefined;
  const playerId = playerIdParsed.success ? playerIdParsed.data : undefined;

  if (championshipId) {
    if (!groupId) {
      return {
        ok: false,
        status: 400,
        error: "groupId is required when filtering by championship",
      };
    }
    const championship = getChampionship(groupId, championshipId);
    if (!championship) {
      return { ok: false, status: 404, error: "Campeonato não encontrado" };
    }
  }

  return {
    ok: true,
    period,
    startDate,
    endDate,
    groupId,
    championshipId,
    playerId,
  };
}

function queryFinishedGames(filters: {
  startDate: string | null;
  endDate: string | null;
  groupId: string | undefined;
  championshipId: string | undefined;
}): GameRow[] {
  const finishedCondition = and(eq(games.finished, true), isNull(games.deletedAt));
  const dateWhere = filters.championshipId
    ? and(finishedCondition, eq(games.championshipId, filters.championshipId))
    : filters.startDate && filters.endDate
      ? and(
          finishedCondition,
          gte(games.date, filters.startDate),
          lte(games.date, filters.endDate),
        )
      : filters.startDate
        ? and(finishedCondition, gte(games.date, filters.startDate))
        : finishedCondition;

  const where = filters.groupId
    ? and(dateWhere, eq(games.groupId, filters.groupId))
    : dateWhere;

  return db
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
}

function computeGamePlayerPnLs(game: GameRow): PlayerGamePnL[] {
  const participants = db
    .select({
      playerId: groupMembers.playerId,
      name: players.name,
      cashOut: gamePlayers.cashOut,
    })
    .from(gamePlayers)
    .innerJoin(groupMembers, eq(gamePlayers.groupMemberId, groupMembers.id))
    .innerJoin(players, eq(players.id, groupMembers.playerId))
    .where(and(eq(gamePlayers.gameId, game.id), isNotNull(gamePlayers.cashOut)))
    .all();

  const totalChips = R.sumBy(participants, (p) => p.cashOut ?? 0);
  if (totalChips === 0) return [];

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

  return R.map(participants, (p) => {
    const cashOut = ((p.cashOut ?? 0) / totalChips) * totalPool;
    const playerBuyInChips = R.sumBy(
      buyInsByPlayer[p.playerId] ?? [],
      (b) => b.chips,
    );
    const buyIn =
      game.chipsPerPlayer > 0
        ? (playerBuyInChips / game.chipsPerPlayer) * game.buyIn
        : game.buyIn;
    return {
      playerId: p.playerId,
      name: p.name,
      buyIn,
      cashOut,
      profitLoss: cashOut - buyIn,
    };
  });
}

app.get("/", (c) => {
  const filters = resolveFilters(c);
  if (!filters.ok) {
    return c.json({ error: filters.error }, filters.status);
  }

  const gameRows = queryFinishedGames(filters);

  const byPlayer = new Map<
    string,
    { name: string; totalIn: number; totalOut: number }
  >();

  R.forEach(gameRows, (game) => {
    R.forEach(computeGamePlayerPnLs(game), (p) => {
      const entry = byPlayer.get(p.playerId);
      byPlayer.set(p.playerId, {
        name: entry?.name ?? p.name,
        totalIn: (entry?.totalIn ?? 0) + p.buyIn,
        totalOut: (entry?.totalOut ?? 0) + p.cashOut,
      });
    });
  });

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
    period: filters.period,
    startDate: filters.startDate ?? null,
    endDate: filters.endDate ?? null,
    groupId: filters.groupId ?? null,
    players: playersList,
  });

  return c.json(response);
});

app.get("/series", (c) => {
  const filters = resolveFilters(c);
  if (!filters.ok) {
    return c.json({ error: filters.error }, filters.status);
  }

  const gameRows = queryFinishedGames(filters);
  const cumulative = new Map<string, { name: string; profitLoss: number }>();
  const points: {
    date: string;
    gameId: string;
    values: { playerId: string; profitLoss: number }[];
  }[] = [];

  R.forEach(gameRows, (game) => {
    const gamePnLs = computeGamePlayerPnLs(game);
    if (gamePnLs.length === 0) return;

    const relevantPnLs = filters.playerId
      ? R.filter(gamePnLs, (p) => p.playerId === filters.playerId)
      : gamePnLs;

    // Single-player filter: only emit points for games they played.
    if (relevantPnLs.length === 0) return;

    R.forEach(relevantPnLs, (p) => {
      const entry = cumulative.get(p.playerId);
      cumulative.set(p.playerId, {
        name: entry?.name ?? p.name,
        profitLoss: (entry?.profitLoss ?? 0) + p.profitLoss,
      });
    });

    // Carry forward prior totals for players who sat this game out.
    const values = R.pipe(
      Array.from(cumulative.entries()),
      R.map(([playerId, { profitLoss }]) => ({ playerId, profitLoss })),
    );

    points.push({
      date: game.date,
      gameId: game.id,
      values,
    });
  });

  const seriesPlayers = R.pipe(
    cumulative.entries(),
    (entries) => Array.from(entries),
    R.filter(([playerId]) =>
      filters.playerId ? playerId === filters.playerId : true,
    ),
    R.map(([id, { name }]) => ({ id, name })),
  );

  const response = ApiProfitLossSeriesSchema.parse({
    period: filters.period,
    startDate: filters.startDate ?? null,
    endDate: filters.endDate ?? null,
    groupId: filters.groupId ?? null,
    playerId: filters.playerId ?? null,
    players: seriesPlayers,
    points,
  });

  return c.json(response);
});

export default app;
