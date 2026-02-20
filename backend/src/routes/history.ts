import { Hono } from "hono";
import { db } from "../db";
import type { GameWithPlayers } from "../types";

const app = new Hono();

type GameRow = {
  id: string;
  date: string;
  buy_in: number;
  chips_per_player: number;
  finished: number;
};

app.get("/", (c) => {
  const games = db
    .query<GameRow, []>(
      "SELECT id, date, buy_in, chips_per_player, finished FROM games ORDER BY date DESC"
    )
    .all();

  const result: GameWithPlayers[] = games.map((g) => {
    const players = db
      .query<
        { player_id: string; name: string; initial_chips: number; final_chips: number | null },
        [string]
      >(
        `SELECT gp.player_id, p.name, gp.initial_chips, gp.final_chips
         FROM game_players gp
         JOIN players p ON p.id = gp.player_id
         WHERE gp.game_id = ?`
      )
      .all(g.id);
    return {
      ...g,
      finished: Boolean(g.finished),
      players,
    };
  });

  return c.json(
    result.map((g) => ({
      id: g.id,
      date: g.date,
      buy_in: g.buy_in,
      chips_per_player: g.chips_per_player,
      finished: g.finished,
      players: g.players.map((p) => ({
        player_id: p.player_id,
        name: p.name,
        initial_chips: p.initial_chips,
        final_chips: p.final_chips,
      })),
    }))
  );
});

export default app;
