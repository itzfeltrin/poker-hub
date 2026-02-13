import { Hono } from "hono";
import { db } from "../db";
import type { Jogador } from "../types";

const app = new Hono();

// Listar todos os jogadores
app.get("/", (c) => {
  const rows = db.query<Jogador>("SELECT id, nome FROM jogadores ORDER BY nome").all();
  return c.json(rows);
});

// Criar jogador (nome no body, id = UUID)
app.post("/", async (c) => {
  const body = await c.req.json<{ nome: string }>();
  const nome = body.nome?.trim();
  if (!nome) {
    return c.json({ erro: "Nome é obrigatório" }, 400);
  }
  const id = crypto.randomUUID();
  db.run("INSERT INTO jogadores (id, nome) VALUES (?, ?)", [id, nome]);
  const jogador = db.query<Jogador>("SELECT id, nome FROM jogadores WHERE id = ?").get(id) as Jogador;
  return c.json(jogador, 201);
});

// Obter um jogador por id
app.get("/:id", (c) => {
  const id = c.req.param("id");
  const jogador = db.query<Jogador>("SELECT id, nome FROM jogadores WHERE id = ?").get(id);
  if (!jogador) return c.json({ erro: "Jogador não encontrado" }, 404);
  return c.json(jogador);
});

export default app;
