import { Hono } from "hono";
import { db } from "../db";
import type { Player } from "../types";

const app = new Hono();

app.get("/", (c) => {
  const rows = db.query<Player, []>("SELECT id, name FROM players ORDER BY name").all();
  return c.json(rows.map((p) => ({ id: p.id, nome: p.name })));
});

app.post("/", async (c) => {
  const body = await c.req.json<{ nome: string }>();
  const name = body.nome?.trim();
  if (!name) {
    return c.json({ erro: "Nome é obrigatório" }, 400);
  }
  const id = crypto.randomUUID();
  db.run("INSERT INTO players (id, name) VALUES (?, ?)", [id, name]);
  const player = db.query<Player, [string]>("SELECT id, name FROM players WHERE id = ?").get(id);
  if (!player) return c.json({ erro: "Erro ao criar jogador" }, 500);
  return c.json({ id: player.id, nome: player.name }, 201);
});

app.get("/:id", (c) => {
  const id = c.req.param("id");
  const player = db.query<Player, [string]>("SELECT id, name FROM players WHERE id = ?").get(id);
  if (!player) return c.json({ erro: "Jogador não encontrado" }, 404);
  return c.json({ id: player.id, nome: player.name });
});

export default app;
