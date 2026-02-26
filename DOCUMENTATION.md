# Poker Hub – Chat Summary (Reference)

Summary of deployment, infrastructure, and code decisions from development sessions.

---

## 1. Deployment (Docker & PaaS)

### Single Docker Compose
- **One service** runs the backend (Bun/Hono), which also serves the built frontend from `./public`.
- **SQLite** path is configurable via `DATABASE_PATH` (default in Docker: `/data/poker-hub.sqlite`). Use a **volume** so the DB persists across restarts.
- **No need to switch to Postgres** for this scale; SQLite + volume is enough.

### Files added/updated
- **`Dockerfile`** – Multi-stage: build frontend (Vite, `VITE_API_URL=`), then production stage runs backend with `backend/public` = frontend dist. Runs from `backend/` so `drizzle/` and `./public` resolve. Creates `/data` and `chmod 777` for PaaS.
- **`docker-compose.yml`** – One service, port 3000, volume `poker-hub-data:/data`.
- **`.dockerignore`** – node_modules, .git, *.sqlite, etc.
- **`DEPLOY.md`** – Short deploy and SQLite notes.

### Backend production behavior
- **Env:** `NODE_ENV=production`, `PORT`, `DATABASE_PATH`.
- **API** is mounted under **`/api`** so the frontend (which calls `{{base}}/api/...`) works: `/api/players`, `/api/games`, `/api/history`, `/api/profit-loss`, `/api/doc`, `/api/docs`.
- **Static + SPA:** In production, serves `./public` and falls back to `index.html` for non-API routes.
- **DB:** Backend creates parent directory of `DATABASE_PATH` if missing (so `/data` can be used when the volume is present).

### Railway
- **Port:** 3000 (one service).
- **Custom domain:** CNAME at root (`@`) is not supported by many registrars (e.g. GoDaddy). Options: use **www** with CNAME to `xxx.up.railway.app`, or use **Cloudflare** (CNAME flattening) for root.
- **Trial:** Railway’s free trial ends; no permanent free tier. Alternatives: **Oracle Cloud Free Tier** (always-free VM), **Fly.io** (paid after trial), **Render** (free tier but ephemeral disk for SQLite).

---

## 2. Oracle Cloud VM (Ubuntu)

### Networking
- **VCN** = virtual network; **VNIC** = VM’s network interface (subnet attachment). Ingress rules apply to the **security list** attached to the instance’s **subnet**.
- **Public IP:** Reserve a “Reserved public IP” in Networking, then attach it to the instance’s primary VNIC (edit the private IP → assign reserved public IP).
- **Ingress:** Allow TCP 22 (SSH), 8080 (Vite dev), 3000 (backend). Source `0.0.0.0/0`, destination port = 8080 or 3000. No egress rule needed for incoming browser traffic.
- **iptables:** Ubuntu image had a catch‑all **REJECT** rule. Allow ports explicitly:
  ```bash
  sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
  sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
  sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
  ```
  Persist with `sudo netfilter-persistent save` or use **ufw** (e.g. `ufw allow 8080/tcp` then `ufw enable`).

### SSH
- **Key permissions:** `chmod 600 /path/to/private-key.key`.
- **Second session:** If the second SSH hangs, disable multiplexing: `ssh -o ControlMaster=no -i key user@host`, or add `ControlMaster no` for that host in `~/.ssh/config`.

### Running the app on the VM
- **Dev:** `bun run dev` → frontend :8080, backend :3000. Access at `http://<publicIP>:8080`.
- **Vite proxy:** Frontend uses `/api`; backend serves under `/api`. Proxy must **not** strip `/api` (no `rewrite`), so requests to `:8080/api/players` are forwarded to `localhost:3000/api/players`.
- **Allowed hosts:** In `vite.config.ts`, `server.allowedHosts: ["pokerhub.fun", "www.pokerhub.fun"]` (or `true`) when using Cloudflare Tunnel so Vite accepts the Host header.

### Custom domain (Cloudflare Tunnel)
- **cloudflared** runs on the VM and forwards pokerhub.fun → `http://127.0.0.1:8080`.
- **Config:** `/etc/cloudflared/config.yml` with tunnel ID, credentials path, ingress (hostname → service).
- **Service:** `cloudflared service install`, `systemctl enable cloudflared`, `systemctl start cloudflared` so the tunnel runs in the background and survives reboot.

### Systemd for the app
- **Service:** e.g. `/etc/systemd/system/poker-hub.service` – `User=ubuntu`, `WorkingDirectory=/home/ubuntu/Dev/poker-hub`, `ExecStart=/home/ubuntu/.nvm/versions/node/v22.22.0/bin/bun run dev`, `Restart=always`. `Environment=PATH=...` so `bun` is found.
- **Enable/start:** `systemctl enable poker-hub`, `systemctl start poker-hub`.

### Auto deploy (GitHub Action)
- **Secrets:** `VM_HOST` (public IP), `VM_SSH_KEY` (private key for `ubuntu`).
- **Passwordless restart:** `sudo visudo` → `ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart poker-hub`.
- **Workflow:** On push to `main`, SSH to VM, `cd repo && git pull origin main && sudo systemctl restart poker-hub` (e.g. using `appleboy/ssh-action`).

### Docker on VM
- **Permission denied** for Docker socket: `sudo usermod -aG docker $USER`, then log out/in or `newgrp docker`.

---

## 3. API & Frontend: camelCase Everywhere

### Convention
- **API (request/response)** and **frontend** use **camelCase**.
- **Snake_case** only for **DB** (table/column names in schema and migrations).

### Backend
- **`backend/src/types.ts`** – `Game`, `GameWithPlayers`, `ProfitLoss` use camelCase (`buyIn`, `chipsPerPlayer`, `playerId`, `initialChips`, `finalChips`, `totalIn`, `totalOut`, `profitLoss`).
- **Routes:** All JSON responses and request bodies use camelCase (e.g. `buyIn`, `chipsPerPlayer`, `playerIds`, `finalChips`). History, games, profit-loss return camelCase; games POST accepts `ApiGameCreate` (camelCase), PATCH finalize accepts `finalChips`.
- **Profit-loss** query params: backend accepts `startDate`/`endDate` (and still `start_date`/`end_date` for compatibility).

### Frontend
- **Model types:** `frontend/src/models/players/types.ts`, `models/games/types.ts`, `models/profit-loss/types.ts` – re-export or define API types in camelCase. Games use `ApiGameWithPlayers` for history and game detail.
- **Utils:** `apiGameToGame` and player/PnL helpers use camelCase (`playerId`, `buyIn`, `chipsPerPlayer`, `finalChips`, `profitLoss`).
- **Pages/components:** NewGamePage sends `buyIn`, `chipsPerPlayer`, `playerIds`; FinalizeGameDialog uses `finalChips`; GameDetailsPage, HistoryPage, Index use camelCase for game/player fields.
- **Index.tsx – PnL in money:** For “recent games” the per-player PnL must be in **money**, not chips: `pricePerChip = game.buyIn / game.chipsPerPlayer`, then `pnl = (finalChips - initialChips) * pricePerChip`.

### Shared package (`packages/db`)
- **`ApiGamePlayer.finalChips`** is `number | null` to match API (unfinalized games). Schema and column names stay snake_case in the DB.

---

## 4. Fixes & Gotchas

### Backend
- **history.ts** – Response had been mapping to snake_case while the built object used camelCase from the DB; fixed by returning camelCase in the JSON.
- **players.ts** – Import from `@poker-hub/db` (main entry), not `@poker-hub/db/src/schema`. Package exports are `"."` and `"./schema"`; use main entry for `players` so resolution works.

### TypeScript (backend)
- **`backend/tsconfig.json`** – Added `"module": "ESNext"` and `"moduleResolution": "bundler"` so subpath imports like `@poker-hub/db/schema` resolve via the package `exports` field. Prefer importing from `@poker-hub/db` where possible.

### DNS (GoDaddy)
- Root (`@`) **CNAME** is not supported; use **www** with CNAME, or move DNS to **Cloudflare** and use CNAME flattening for the root. After switching to Cloudflare, **nameservers** must be updated at the registrar (GoDaddy) to Cloudflare’s; until then, traffic still uses the old DNS and the new records have no effect.

---

## 5. PWA (Progressive Web App)

To make the app installable on mobile:
- **Web app manifest** – name, short_name, theme_color, background_color, display: standalone, start_url, icons (e.g. 192, 512).
- **Service worker** – Required for installability and caching (e.g. via **vite-plugin-pwa**).
- **HTML** – `<link rel="manifest">`, `<meta name="theme-color">`, and for iOS: `apple-mobile-web-app-capable`, `apple-touch-icon`.
- **vite-plugin-pwa** can generate manifest and inject a Workbox service worker; add icons in `public/` and configure the plugin in `vite.config.ts`.

---

## 6. File / Config Reference

| Topic              | Files |
|--------------------|--------|
| Deploy             | `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `DEPLOY.md` |
| Backend env/API    | `backend/src/index.ts` (PORT, /api, static), `backend/src/db/index.ts` (DATABASE_PATH) |
| Vite proxy         | `frontend/vite.config.ts` – proxy `/api` to backend, no rewrite |
| Vite allowed hosts | `frontend/vite.config.ts` – `server.allowedHosts` for custom domain |
| API types          | `packages/db/src/api-types/*`, `backend/src/types.ts`, `frontend/src/models/*/types.ts` |
| TS resolution      | `backend/tsconfig.json` – moduleResolution: bundler |

---

*Generated as a summary of chat context for future reference.*
