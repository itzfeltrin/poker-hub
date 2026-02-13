import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import players from "./routes/players";
import games from "./routes/games";
import history from "./routes/history";
import profitLoss from "./routes/profit-loss";
import { openApiDoc } from "./openapi";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    nome: "Poker Hub API",
    endpoints: {
      jogadores: "/jogadores",
      partidas: "/partidas",
      historico: "/historico",
      lucros_perdas: "/lucros-perdas",
      docs: "/docs",
    },
  });
});

app.get("/doc", (c) => c.json(openApiDoc));
app.get("/docs", swaggerUI({ url: "/doc" }));

app.route("/jogadores", players);
app.route("/partidas", games);
app.route("/historico", history);
app.route("/lucros-perdas", profitLoss);

export default app;
