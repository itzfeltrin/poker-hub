import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import players from "./routes/players";
import games from "./routes/games";
import history from "./routes/history";
import profitLoss from "./routes/profit-loss";
import { openApiDoc } from "./openapi";

const app = new Hono();

// API root (only when not serving SPA from same server)
const isProduction = process.env.NODE_ENV === "production";
if (!isProduction) {
  app.get("/", (c) =>
    c.json({
      name: "Poker Hub API",
      endpoints: {
        players: "/players",
        games: "/games",
        history: "/history",
        profit_loss: "/profit-loss",
        docs: "/docs",
      },
    })
  );
}

app.get("/doc", (c) => c.json(openApiDoc));
app.get("/docs", swaggerUI({ url: "/doc" }));

app.route("/players", players);
app.route("/games", games);
app.route("/history", history);
app.route("/profit-loss", profitLoss);

// Production: serve frontend static files and SPA fallback
if (isProduction) {
  const publicRoot = "./public";
  app.get("*", async (c) => {
    const path = c.req.path === "/" ? "/index.html" : c.req.path;
    const file = Bun.file(`${publicRoot}${path}`);
    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "Content-Type":
            path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : "application/octet-stream",
        },
      });
    }
    return c.html(await Bun.file(`${publicRoot}/index.html`).text());
  });
}

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};
