import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import players from "./routes/players";
import locations from "./routes/locations";
import games from "./routes/games";
import history from "./routes/history";
import profitLoss from "./routes/profit-loss";
import { openApiDoc } from "./openapi";

const app = new Hono();
const isProduction = process.env.NODE_ENV === "production";

// Mount API under /api so frontend (which calls {{base}}/api/...) works in production
const api = new Hono();
if (!isProduction) {
  api.get("/", (c) =>
    c.json({
      name: "Poker Hub API",
      endpoints: {
        players: "/api/players",
        locations: "/api/locations",
        games: "/api/games",
        history: "/api/history",
        profit_loss: "/api/profit-loss",
        docs: "/api/docs",
      },
    })
  );
}
api.get("/doc", (c) => c.json(openApiDoc));
api.get("/docs", swaggerUI({ url: "/api/doc" }));
api.route("/players", players);
api.route("/locations", locations);
api.route("/games", games);
api.route("/history", history);
api.route("/profit-loss", profitLoss);

app.route("/api", api);

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
