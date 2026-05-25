import { Hono } from "hono";
import { and, desc, eq, or, sql, isNull, isNotNull } from "drizzle-orm";
import { db } from "../db";
import {
  ApiGroupCreateSchema,
  ApiGroupLedgerEntryWithPlayerSchema,
  ApiGroupLedgerManualCreateSchema,
  ApiGroupLedgerSnapshotSchema,
  ApiGroupMemberBalanceSchema,
  ApiGroupMemberSchema,
  ApiGroupPatchSchema,
  ApiGroupSchema,
  games,
  groupLedgerEntries,
  groupMembers,
  groups,
  players,
} from "@poker-hub/db";
import * as R from "remeda";
import z from "zod";

const app = new Hono();

function newId(): string {
  return crypto.randomUUID();
}

app.get("/", (c) => {
  const rows = db
    .select({
      id: groups.id,
      name: groups.name,
      gameCount: sql<number>`count(${games.id})`.as("gameCount"),
    })
    .from(groups)
    .leftJoin(
      games,
      and(eq(games.groupId, groups.id), isNull(games.deletedAt)),
    )
    .groupBy(groups.id)
    .orderBy(groups.name)
    .all();

  return c.json(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = ApiGroupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid group" }, 400);
  }

  const existing = db
    .select()
    .from(groups)
    .where(eq(groups.name, parsed.data.name))
    .get();
  if (existing) {
    return c.json({ error: "Group with this name already exists" }, 409);
  }

  const id = parsed.data.id ?? newId();
  db.insert(groups).values({ id, name: parsed.data.name }).run();

  return c.json({ id, name: parsed.data.name }, 201);
});

app.get("/:groupId/members", (c) => {
  const groupId = c.req.param("groupId");
  const groupRow = db.select().from(groups).where(eq(groups.id, groupId)).get();
  if (!groupRow) return c.json({ error: "Group not found" }, 404);

  const rows = db
    .select({
      id: groupMembers.id,
      groupId: groupMembers.groupId,
      playerId: groupMembers.playerId,
      name: players.name,
    })
    .from(groupMembers)
    .innerJoin(players, eq(players.id, groupMembers.playerId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(players.name)
    .all();

  const members = R.pipe(
    rows,
    R.map((r) =>
      ApiGroupMemberSchema.parse({
        id: r.id,
        groupId: r.groupId,
        playerId: r.playerId,
        name: r.name,
      }),
    ),
  );

  return c.json(members);
});

const AddMemberBodySchema = z.object({
  playerId: z.uuid(),
});

app.post("/:groupId/members", async (c) => {
  const groupId = c.req.param("groupId");
  const groupRow = db.select().from(groups).where(eq(groups.id, groupId)).get();
  if (!groupRow) return c.json({ error: "Group not found" }, 404);

  const body = await c.req.json();
  const parsed = AddMemberBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  const playerRow = db
    .select()
    .from(players)
    .where(eq(players.id, parsed.data.playerId))
    .get();
  if (!playerRow) return c.json({ error: "Player not found" }, 404);

  const existing = db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.playerId, parsed.data.playerId),
      ),
    )
    .get();
  if (existing) return c.json(ApiGroupMemberSchema.parse({
    id: existing.id,
    groupId: existing.groupId,
    playerId: existing.playerId,
    name: playerRow.name,
  }), 200);

  const id = newId();
  db.insert(groupMembers)
    .values({
      id,
      groupId,
      playerId: parsed.data.playerId,
    })
    .run();

  return c.json(
    ApiGroupMemberSchema.parse({
      id,
      groupId,
      playerId: parsed.data.playerId,
      name: playerRow.name,
    }),
    201,
  );
});

app.get("/:groupId/ledger", (c) => {
  const groupId = c.req.param("groupId");
  const groupRow = db.select().from(groups).where(eq(groups.id, groupId)).get();
  if (!groupRow) return c.json({ error: "Group not found" }, 404);

  const balanceRows = db
    .select({
      groupMemberId: groupMembers.id,
      playerId: players.id,
      playerName: players.name,
      balanceCents:
        sql<number>`coalesce(sum(
          CASE
            WHEN ${groupLedgerEntries.gameId} IS NULL THEN ${groupLedgerEntries.amountCents}
            WHEN ${games.id} IS NOT NULL AND ${games.deletedAt} IS NULL THEN ${groupLedgerEntries.amountCents}
            ELSE 0
          END
        ), 0)`.as("balanceCents"),
    })
    .from(groupMembers)
    .innerJoin(players, eq(players.id, groupMembers.playerId))
    .leftJoin(
      groupLedgerEntries,
      eq(groupLedgerEntries.groupMemberId, groupMembers.id),
    )
    .leftJoin(games, eq(groupLedgerEntries.gameId, games.id))
    .where(eq(groupMembers.groupId, groupId))
    .groupBy(groupMembers.id, players.id, players.name)
    .orderBy(players.name)
    .all();

  const entryRows = db
    .select({
      id: groupLedgerEntries.id,
      groupMemberId: groupLedgerEntries.groupMemberId,
      amountCents: groupLedgerEntries.amountCents,
      transactionType: groupLedgerEntries.transactionType,
      gameId: groupLedgerEntries.gameId,
      note: groupLedgerEntries.note,
      createdAt: groupLedgerEntries.createdAt,
      playerName: players.name,
      playerId: players.id,
    })
    .from(groupLedgerEntries)
    .innerJoin(
      groupMembers,
      eq(groupLedgerEntries.groupMemberId, groupMembers.id),
    )
    .innerJoin(players, eq(groupMembers.playerId, players.id))
    .leftJoin(games, eq(groupLedgerEntries.gameId, games.id))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        or(
          isNull(groupLedgerEntries.gameId),
          and(isNotNull(games.id), isNull(games.deletedAt)),
        ),
      ),
    )
    .orderBy(desc(groupLedgerEntries.createdAt))
    .all();

  const balances = R.pipe(
    balanceRows,
    R.map((r) =>
      ApiGroupMemberBalanceSchema.parse({
        groupMemberId: r.groupMemberId,
        playerId: r.playerId,
        playerName: r.playerName,
        balanceCents: Number(r.balanceCents),
      }),
    ),
  );

  const entries = R.pipe(
    entryRows,
    R.map((r) =>
      ApiGroupLedgerEntryWithPlayerSchema.parse({
        id: r.id,
        groupMemberId: r.groupMemberId,
        amountCents: r.amountCents,
        transactionType: r.transactionType,
        gameId: r.gameId,
        note: r.note,
        createdAt: r.createdAt,
        playerName: r.playerName,
        playerId: r.playerId,
      }),
    ),
  );

  const snapshot = ApiGroupLedgerSnapshotSchema.parse({ balances, entries });
  return c.json(snapshot);
});

app.post("/:groupId/ledger", async (c) => {
  const groupId = c.req.param("groupId");
  const groupRow = db.select().from(groups).where(eq(groups.id, groupId)).get();
  if (!groupRow) return c.json({ error: "Group not found" }, 404);

  const body = await c.req.json();
  const parsed = ApiGroupLedgerManualCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      400,
    );
  }

  const memberRow = db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.id, parsed.data.groupMemberId),
        eq(groupMembers.groupId, groupId),
      ),
    )
    .get();
  if (!memberRow) {
    return c.json({ error: "Group member not found in this group" }, 404);
  }

  const id = newId();
  const createdAt = new Date().toISOString();
  db.insert(groupLedgerEntries)
    .values({
      id,
      groupMemberId: parsed.data.groupMemberId,
      amountCents: parsed.data.amountCents,
      transactionType: parsed.data.transactionType,
      gameId: null,
      note: parsed.data.note ?? null,
      createdAt,
    })
    .run();

  const playerRow = db
    .select({ name: players.name })
    .from(players)
    .where(eq(players.id, memberRow.playerId))
    .get();

  const row = ApiGroupLedgerEntryWithPlayerSchema.parse({
    id,
    groupMemberId: parsed.data.groupMemberId,
    amountCents: parsed.data.amountCents,
    transactionType: parsed.data.transactionType,
    gameId: null,
    note: parsed.data.note ?? null,
    createdAt,
    playerId: memberRow.playerId,
    playerName: playerRow?.name ?? "",
  });

  return c.json(row, 201);
});

app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = db.select().from(groups).where(eq(groups.id, id)).get();
  if (!existing) return c.json({ error: "Group not found" }, 404);

  const body = await c.req.json();
  const parsed = ApiGroupPatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  const name = parsed.data.name.trim();
  const duplicate = db.select().from(groups).where(eq(groups.name, name)).get();
  if (duplicate && duplicate.id !== id) {
    return c.json({ error: "Group with this name already exists" }, 409);
  }

  db.update(groups).set({ name }).where(eq(groups.id, id)).run();
  const updated = db.select().from(groups).where(eq(groups.id, id)).get();
  if (!updated) return c.json({ error: "Group not found" }, 404);
  const api = ApiGroupSchema.safeParse(updated);
  if (!api.success) return c.json({ error: api.error.issues[0]?.message }, 400);
  return c.json(api.data);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const row = db.select().from(groups).where(eq(groups.id, id)).get();
  if (!row) return c.json({ error: "Group not found" }, 404);
  const api = ApiGroupSchema.safeParse(row);
  if (!api.success) return c.json({ error: api.error.issues[0]?.message }, 400);
  return c.json(api.data);
});

app.delete("/:id", (c) => {
  const id = c.req.param("id");
  const existing = db.select().from(groups).where(eq(groups.id, id)).get();
  if (!existing) return c.json({ error: "Group not found" }, 404);

  const gamesUsing = db
    .select()
    .from(games)
    .where(and(eq(games.groupId, id), isNull(games.deletedAt)))
    .get();
  if (gamesUsing) {
    return c.json({ error: "Cannot delete group that has games" }, 409);
  }

  db.delete(groupMembers).where(eq(groupMembers.groupId, id)).run();
  db.delete(groups).where(eq(groups.id, id)).run();
  return c.json({ success: true });
});

export default app;
