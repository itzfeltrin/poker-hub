# Deploying Poker Hub

## Docker (recommended)

One service runs the API and serves the frontend. SQLite is stored in a volume so data survives restarts.

```bash
docker compose up --build
```

Then open **http://localhost:3000**.

- **Database**: Stored in the `poker-hub-data` volume at `/data/poker-hub.sqlite`. Migrations run on startup.
- **Env**: Override with a `.env` or `environment` in `docker-compose.yml` (e.g. `PORT`, `DATABASE_PATH`).

## SQLite

You don’t need to switch to Postgres or another DB for this project. SQLite is fine for a single instance and no scaling requirements. The only requirement for deployment is to **persist the DB file** (e.g. with the Docker volume above). Avoid storing it only inside the container filesystem so it isn’t lost on redeploy.

## Standalone run (no Docker)

From the repo root:

```bash
bun install
bun run build
NODE_ENV=production DATABASE_PATH=./data/poker-hub.sqlite PORT=3000 bun run backend/src/index.ts
```

Serve the built frontend from `frontend/dist` (e.g. with nginx or any static host) and point it at the API, or run the backend from `backend/` with a copy of `frontend/dist` as `backend/public` so it serves the SPA as in the Docker setup.
