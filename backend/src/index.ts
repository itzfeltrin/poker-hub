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
    name: "Poker Hub API",
    endpoints: {
      players: "/players",
      games: "/games",
      history: "/history",
      profit_loss: "/profit-loss",
      docs: "/docs",
    },
  });
});

app.get("/doc", (c) => c.json(openApiDoc));
app.get("/docs", swaggerUI({ url: "/doc" }));

app.route("/players", players);
app.route("/games", games);
app.route("/history", history);
app.route("/profit-loss", profitLoss);

export default app;
