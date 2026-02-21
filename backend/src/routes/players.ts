import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { players } from "../db/schema";
import type { Player } from "../types";

const app = new Hono();

app.get("/", (c) => {
  const rows = db
    .select({ id: players.id, name: players.name })
    .from(players)
    .orderBy(players.name)
    .all();
  return c.json(rows.map((p) => ({ id: p.id, name: p.name })));
});

app.post("/", async (c) => {
  const body = await c.req.json<{ name: string }>();
  const name = body.name?.trim();
  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }
  const id = crypto.randomUUID();
  db.insert(players).values({ id, name }).run();
  const player = db.select().from(players).where(eq(players.id, id)).get();
  if (!player) return c.json({ error: "Failed to create player" }, 500);
  return c.json({ id: player.id, name: player.name }, 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const player = db.select().from(players).where(eq(players.id, id)).get();
  if (!player) return c.json({ error: "Player not found" }, 404);
  return c.json({ id: player.id, name: player.name });
});

export default app;
