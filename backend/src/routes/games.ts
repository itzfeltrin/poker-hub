import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  ApiGameSchema,
  ApiGameBuyInCreateSchema,
  ApiGameWithPlayersSchema,
  FinalizeGameBodySchema,
  gamePlayerBuyIns,
  gamePlayers,
  games,
  groupLedgerEntries,
  groupMembers,
  groups,
  players,
} from "@poker-hub/db";
import type { ApiGameWithPlayers } from "@poker-hub/db";
import * as R from "remeda";

const app = new Hono();

function rosterKey(playerIds: readonly string[]): string {
  return R.pipe(
    playerIds,
    R.uniqueBy((x) => x),
    R.sortBy((x) => x),
    (ids) => ids.join("|"),
  );
}

function findGroupIdByExactRoster(playerIds: string[]): string | null {
  const wanted = rosterKey(playerIds);
  const allGroups = db.select({ id: groups.id }).from(groups).all();
  for (const { id: gid } of allGroups) {
    const memberRows = db
      .select({ playerId: groupMembers.playerId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, gid))
      .all();
    const have = rosterKey(R.map(memberRows, (m) => m.playerId));
    if (have === wanted) return gid;
  }
  return null;
}

function createGroupWithRoster(playerIds: string[]): string {
  const unique = R.pipe(
    playerIds,
    R.uniqueBy((x) => x),
    R.sortBy((x) => x),
  );
  const groupId = crypto.randomUUID();
  let baseName = `Mesa · ${unique.length} jogador${unique.length === 1 ? "" : "es"}`;
  let name = baseName;
  let n = 0;
  while (db.select().from(groups).where(eq(groups.name, name)).get()) {
    n += 1;
    name = `${baseName} (${n})`;
  }
  db.insert(groups).values({ id: groupId, name }).run();
  for (const playerId of unique) {
    const mid = crypto.randomUUID();
    db.insert(groupMembers).values({ id: mid, groupId, playerId }).run();
  }
  return groupId;
}

function ensureGroupMemberId(groupId: string, playerId: string): string {
  const existing = db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.playerId, playerId),
      ),
    )
    .get();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  db.insert(groupMembers).values({ id, groupId, playerId }).run();
  return id;
}

app.post("/", async (c) => {
  const body = await c.req.json();
  const apiGame = ApiGameSchema.safeParse(body);
  if (!apiGame.success) {
    return c.json({ error: apiGame.error.issues[0]?.message }, 400);
  }

  const gameData = apiGame.data;
  const { playerIds, groupId: requestedGroupId, ...gameRest } = gameData;

  if (requestedGroupId) {
    const gRow = db.select().from(groups).where(eq(groups.id, requestedGroupId)).get();
    if (!gRow) return c.json({ error: "Group not found" }, 404);
  }

  const groupId =
    requestedGroupId ??
    findGroupIdByExactRoster(playerIds) ??
    createGroupWithRoster(playerIds);

  db.insert(games).values({ ...gameRest, groupId, deletedAt: null }).run();

  const gameDataResolved = { ...gameData, groupId };

  R.forEach(playerIds, (playerId) => {
    const { id: gameId, chipsPerPlayer } = gameDataResolved;
    const groupMemberId = ensureGroupMemberId(groupId, playerId);
    db.insert(gamePlayers).values({ gameId, groupMemberId }).run();

    db.insert(gamePlayerBuyIns)
      .values({
        gameId,
        groupMemberId,
        chips: chipsPerPlayer,
        isInitial: true,
      })
      .run();
  });

  const created = getGameWithPlayers(gameData.id);
  if (!created) return c.json({ error: "Failed to load created game" }, 500);
  return c.json(toGameResponse(created), 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const game = getGameWithPlayers(id);
  if (!game) return c.json({ error: "Game not found" }, 404);
  return c.json(toGameResponse(game));
});

app.delete("/:id", (c) => {
  const gameId = c.req.param("id");
  const existing = db
    .select({ deletedAt: games.deletedAt })
    .from(games)
    .where(eq(games.id, gameId))
    .get();
  if (!existing) return c.json({ error: "Game not found" }, 404);
  if (existing.deletedAt) return c.json({ error: "Game not found" }, 404);

  db.update(games)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(games.id, gameId))
    .run();

  return c.json({ ok: true as const });
});

app.patch("/:id/finalize", async (c) => {
  const gameId = c.req.param("id");
  const gameRow = db
    .select({ finished: games.finished })
    .from(games)
    .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
    .get();
  if (!gameRow) return c.json({ error: "Game not found" }, 404);
  if (gameRow.finished)
    return c.json({ error: "Game is already finalized" }, 400);

  const body = await c.req.json();
  const parsed = FinalizeGameBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid cashOut" },
      400,
    );
  }
  const { cashOut } = parsed.data;

  const participants = db
    .select({
      groupMemberId: gamePlayers.groupMemberId,
      playerId: groupMembers.playerId,
    })
    .from(gamePlayers)
    .innerJoin(
      groupMembers,
      eq(gamePlayers.groupMemberId, groupMembers.id),
    )
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  const missingOrInvalid = R.find(
    participants,
    ({ playerId }) =>
      typeof cashOut[playerId] !== "number" || cashOut[playerId] < 0,
  );
  if (missingOrInvalid) {
    return c.json(
      {
        error: `Invalid cashOut for player ${missingOrInvalid.playerId}. Must be a number >= 0`,
      },
      400,
    );
  }

  R.forEach(participants, ({ groupMemberId, playerId }) => {
    db.update(gamePlayers)
      .set({ cashOut: cashOut[playerId] })
      .where(
        and(
          eq(gamePlayers.gameId, gameId),
          eq(gamePlayers.groupMemberId, groupMemberId),
        ),
      )
      .run();
  });

  db.update(games).set({ finished: true }).where(eq(games.id, gameId)).run();

  insertGameLedgerEntriesForFinalizedGame(gameId);

  const updated = getGameWithPlayers(gameId);
  if (!updated) return c.json({ error: "Failed to finalize" }, 500);
  return c.json(toGameResponse(updated));
});

app.post("/:id/buy-ins", async (c) => {
  const gameId = c.req.param("id");

  const gameRow = db
    .select({
      id: games.id,
      finished: games.finished,
      chipsPerPlayer: games.chipsPerPlayer,
      groupId: games.groupId,
    })
    .from(games)
    .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
    .get();

  if (!gameRow) return c.json({ error: "Game not found" }, 404);
  if (gameRow.finished)
    return c.json({ error: "Game is already finalized" }, 400);

  const body = await c.req.json();
  const parsed = ApiGameBuyInCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid buy-in payload" },
      400,
    );
  }

  const { playerId, chips } = parsed.data;

  const participant = db
    .select({ groupMemberId: gamePlayers.groupMemberId })
    .from(gamePlayers)
    .innerJoin(
      groupMembers,
      eq(gamePlayers.groupMemberId, groupMembers.id),
    )
    .where(
      and(
        eq(gamePlayers.gameId, gameId),
        eq(groupMembers.playerId, playerId),
      ),
    )
    .get();

  if (!participant) {
    return c.json(
      { error: "Player is not registered in this game" },
      404,
    );
  }

  const buyInChips = chips ?? gameRow.chipsPerPlayer;

  db.insert(gamePlayerBuyIns)
    .values({
      gameId,
      groupMemberId: participant.groupMemberId,
      chips: buyInChips,
      isInitial: false,
    })
    .run();

  return c.json({ ok: true }, 201);
});

function getGameWithPlayers(gameId: string): ApiGameWithPlayers | null {
  const gameRow = db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
    .get();
  if (!gameRow) return null;

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
    .where(eq(gamePlayers.gameId, gameId))
    .all();

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
    .where(eq(gamePlayerBuyIns.gameId, gameId))
    .all();

  const buyInsByPlayer = R.groupBy(buyInRows, (b) => b.playerId);

  const playerRows = R.pipe(
    participants,
    R.map((p) => {
      const initialChips = R.sumBy(
        buyInsByPlayer[p.playerId] ?? [],
        (b) => b.chips,
      );
      return {
        id: p.playerId,
        name: p.name,
        initialChips,
        cashOut: p.cashOut,
      };
    }),
  );

  const parsed = ApiGameWithPlayersSchema.safeParse({
    ...gameRow,
    players: playerRows,
  });
  return parsed.success ? parsed.data : null;
}

/** Same money math as `profit-loss` for one finished game; writes one ledger row per member. */
function insertGameLedgerEntriesForFinalizedGame(gameId: string): void {
  const gameRow = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!gameRow) return;

  const participants = db
    .select({
      groupMemberId: gamePlayers.groupMemberId,
      playerId: groupMembers.playerId,
      cashOut: gamePlayers.cashOut,
    })
    .from(gamePlayers)
    .innerJoin(
      groupMembers,
      eq(gamePlayers.groupMemberId, groupMembers.id),
    )
    .where(eq(gamePlayers.gameId, gameId))
    .all();

  const totalChips = R.sumBy(participants, (p) => p.cashOut ?? 0);
  if (totalChips === 0) return;

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
    .where(eq(gamePlayerBuyIns.gameId, gameId))
    .all();

  const buyInsByPlayer = R.groupBy(buyInRows, (b) => b.playerId);
  const totalBuyInChips = R.sumBy(buyInRows, (b) => b.chips);

  const totalPool =
    gameRow.chipsPerPlayer > 0
      ? (totalBuyInChips / gameRow.chipsPerPlayer) * gameRow.buyIn
      : gameRow.buyIn * participants.length;

  const createdAt = new Date().toISOString();

  R.forEach(participants, (p) => {
    const co = p.cashOut ?? 0;
    const payout = (co / totalChips) * totalPool;
    const playerBuyInChips = R.sumBy(
      buyInsByPlayer[p.playerId] ?? [],
      (b) => b.chips,
    );
    const totalIn =
      gameRow.chipsPerPlayer > 0
        ? (playerBuyInChips / gameRow.chipsPerPlayer) * gameRow.buyIn
        : gameRow.buyIn;
    const profitBrl = payout - totalIn;
    const amountCents = Math.round(profitBrl * 100);

    db.insert(groupLedgerEntries)
      .values({
        id: crypto.randomUUID(),
        groupMemberId: p.groupMemberId,
        amountCents,
        transactionType: "game",
        gameId,
        note: null,
        createdAt,
      })
      .run();
  });
}

function toGameResponse(g: ApiGameWithPlayers) {
  return {
    id: g.id,
    date: g.date,
    buyIn: g.buyIn,
    chipsPerPlayer: g.chipsPerPlayer,
    locationId: g.locationId,
    groupId: g.groupId,
    finished: g.finished,
    players: R.map(g.players, (p) => ({
      id: p.id,
      name: p.name,
      initialChips: p.initialChips,
      cashOut: p.cashOut,
    })),
  };
}

export default app;
export { getGameWithPlayers };
