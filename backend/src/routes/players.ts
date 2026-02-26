import { Hono } from "hono";
import * as R from "remeda";
import { db } from "../db";
import { ApiPlayerSchema, players } from "@poker-hub/db";
import z from "zod";
import { eq } from "drizzle-orm";

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

export default app;
