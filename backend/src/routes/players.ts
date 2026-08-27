import { Hono } from "hono";
import * as R from "remeda";
import { db } from "../db";
import {
  ApiPlayerSchema,
  games,
  gamePlayerBuyIns,
  gamePlayers,
  groupLedgerEntries,
  groupMembers,
  players,
} from "@poker-hub/db";
import { z } from "zod/v4";
import { and, eq, inArray, isNull } from "drizzle-orm";

const app = new Hono();

app.get("/", (c) => {
  const apiPlayers = R.pipe(
    db.select().from(players).orderBy(players.name).all(),
    (rows) => z.array(ApiPlayerSchema).safeParse(rows),
  );
  if (!apiPlayers.success) {
    return c.json({ error: apiPlayers.error.issues[0]?.message }, 400);
  }
  return c.json(apiPlayers.data);
});

app.post("/", async (c) => {
  const body = await c.req.json();

  const apiPlayer = ApiPlayerSchema.safeParse(body);
  if (!apiPlayer.success) {
    return c.json({ error: apiPlayer.error.issues[0]?.message }, 400);
  }

  db.insert(players).values(apiPlayer.data).run();

  return c.json(apiPlayer.data, 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const row = db.select().from(players).where(eq(players.id, id)).get();
  if (!row) return c.json({ error: "Player not found" }, 404);
  const apiPlayer = ApiPlayerSchema.safeParse(row);
  if (!apiPlayer.success) {
    return c.json({ error: apiPlayer.error.issues[0]?.message }, 400);
  }
  return c.json(apiPlayer.data);
});

app.delete("/:id", (c) => {
  const id = c.req.param("id");
  const existing = db.select().from(players).where(eq(players.id, id)).get();
  if (!existing) return c.json({ error: "Player not found" }, 404);

  const memberIds = R.pipe(
    db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(eq(groupMembers.playerId, id))
      .all(),
    R.map(R.prop("id")),
  );

  if (memberIds.length > 0) {
    const gamesUsingPlayer = db
      .select({ id: games.id })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .where(
        and(inArray(gamePlayers.groupMemberId, memberIds), isNull(games.deletedAt)),
      )
      .get();

    if (gamesUsingPlayer) {
      return c.json(
        { error: "Cannot delete player that is referenced by games" },
        409,
      );
    }

    db.delete(gamePlayerBuyIns)
      .where(inArray(gamePlayerBuyIns.groupMemberId, memberIds))
      .run();
    db.delete(gamePlayers)
      .where(inArray(gamePlayers.groupMemberId, memberIds))
      .run();
    db.delete(groupLedgerEntries)
      .where(inArray(groupLedgerEntries.groupMemberId, memberIds))
      .run();
    db.delete(groupMembers).where(eq(groupMembers.playerId, id)).run();
  }

  db.delete(players).where(eq(players.id, id)).run();

  return c.json({ success: true });
});

export default app;
