import { Hono } from "hono";
import jogadores from "./routes/jogadores";
import partidas from "./routes/partidas";
import historico from "./routes/historico";
import lucrosPerdas from "./routes/lucros-perdas";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    nome: "Poker Hub API",
    endpoints: {
      jogadores: "/jogadores",
      partidas: "/partidas",
      historico: "/historico",
      lucros_perdas: "/lucros-perdas",
    },
  });
});

app.route("/jogadores", jogadores);
app.route("/partidas", partidas);
app.route("/historico", historico);
app.route("/lucros-perdas", lucrosPerdas);

export default app;
