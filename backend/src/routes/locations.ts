import { Hono } from "hono";
import * as R from "remeda";
import { db } from "../db";
import { ApiLocationSchema, locations, games } from "@poker-hub/db";
import { z } from "zod/v4";
import { and, eq, isNull, sql } from "drizzle-orm";

const app = new Hono();

app.get("/", (c) => {
  const rows = db
    .select({
      id: locations.id,
      name: locations.name,
      gameCount: sql<number>`count(${games.id})`.as("gameCount"),
    })
    .from(locations)
    .leftJoin(
      games,
      and(eq(games.locationId, locations.id), isNull(games.deletedAt)),
    )
    .groupBy(locations.id)
    .orderBy(locations.name)
    .all();

  return c.json(rows);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const row = db.select().from(locations).where(eq(locations.id, id)).get();
  if (!row) return c.json({ error: "Location not found" }, 404);

  const apiLocation = ApiLocationSchema.safeParse(row);
  if (!apiLocation.success) {
    return c.json({ error: apiLocation.error.issues[0]?.message }, 400);
  }
  return c.json(apiLocation.data);
});

app.post("/", async (c) => {
  const body = await c.req.json();

  const apiLocation = ApiLocationSchema.safeParse(body);
  if (!apiLocation.success) {
    return c.json({ error: apiLocation.error.issues[0]?.message }, 400);
  }

  const existing = db
    .select()
    .from(locations)
    .where(eq(locations.name, apiLocation.data.name))
    .get();

  if (existing) {
    return c.json({ error: "Location with this name already exists" }, 409);
  }

  db.insert(locations).values(apiLocation.data).run();

  return c.json(apiLocation.data, 201);
});

app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = db.select().from(locations).where(eq(locations.id, id)).get();
  if (!existing) return c.json({ error: "Location not found" }, 404);

  const updateSchema = ApiLocationSchema.pick({ name: true });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message }, 400);
  }

  const duplicate = db
    .select()
    .from(locations)
    .where(eq(locations.name, parsed.data.name))
    .get();

  if (duplicate && duplicate.id !== id) {
    return c.json({ error: "Location with this name already exists" }, 409);
  }

  db.update(locations).set(parsed.data).where(eq(locations.id, id)).run();

  const updated = db.select().from(locations).where(eq(locations.id, id)).get();
  return c.json(updated);
});

app.delete("/:id", (c) => {
  const id = c.req.param("id");

  const existing = db.select().from(locations).where(eq(locations.id, id)).get();
  if (!existing) return c.json({ error: "Location not found" }, 404);

  const gamesUsingLocation = db
    .select()
    .from(games)
    .where(and(eq(games.locationId, id), isNull(games.deletedAt)))
    .get();

  if (gamesUsingLocation) {
    return c.json(
      { error: "Cannot delete location that is referenced by games" },
      409
    );
  }

  db.delete(locations).where(eq(locations.id, id)).run();

  return c.json({ success: true });
});

export default app;
