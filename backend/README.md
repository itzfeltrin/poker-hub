# Poker Hub – API

API to register players, games, and query history and profit/loss.

## How to run

```bash
bun install
bun run dev
```

Server at `http://localhost:3000`.

## Swagger

- **GET /docs** – Swagger UI (interactive docs)
- **GET /doc** – OpenAPI 3.0 spec (JSON)

## Endpoints

### Players (`/players`)

- **GET /players** – List all players
- **POST /players** – Create player  
  Body: `{ "name": "Player Name" }`  
  Returns the player with `id` (UUID) and `name`
- **GET /players/:id** – Get a player

### Games (`/games`)

- **POST /games** – Create new game  
  Body: `{ "buy_in": 100, "chips_per_player": 1000, "player_ids": ["uuid1", "uuid2"] }`
- **GET /games/:id** – Get a game with players and chips
- **PATCH /games/:id/finalize** – Finalize the game with final chips  
  Body: `{ "final_chips": { "player_id": 1500, "other_id": 500 } }`  
  Each player's payout is computed proportionally to total chips (pool = buy_in × number of players).

### History (`/history`)

- **GET /history** – List all games (most recent first), with players and initial/final chips

### Profit and loss (`/profit-loss`)

- **GET /profit-loss** – P&L per player  
  Query: `period` = `last_7_days` | `last_month` | `last_year` | `all_time` | `custom`  
  For `custom`: `start_date` and `end_date` in ISO (e.g. `2025-01-01T00:00:00.000Z`).

Example: `GET /profit-loss?period=last_month`

Response includes per player: `total_buy_in`, `total_cash_out`, `profit_loss`.

## Persistence

SQLite in `poker-hub.sqlite` in the backend folder (created automatically). Tables: `players`, `games`, `game_players`.
