import { Hono } from "hono";
import { db } from "../db";
import type { Player } from "../types";

const app = new Hono();

app.get("/", (c) => {
  const rows = db.query<Player, []>("SELECT id, name FROM players ORDER BY name").all();
  return c.json(rows.map((p) => ({ id: p.id, name: p.name })));
});

app.post("/", async (c) => {
  const body = await c.req.json<{ name: string }>();
  const name = body.name?.trim();
  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }
  const id = crypto.randomUUID();
  db.run("INSERT INTO players (id, name) VALUES (?, ?)", [id, name]);
  const player = db.query<Player, [string]>("SELECT id, name FROM players WHERE id = ?").get(id);
  if (!player) return c.json({ error: "Failed to create player" }, 500);
  return c.json({ id: player.id, name: player.name }, 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const player = db.query<Player, [string]>("SELECT id, name FROM players WHERE id = ?").get(id);
  if (!player) return c.json({ error: "Player not found" }, 404);
  return c.json({ id: player.id, name: player.name });
});

export default app;
