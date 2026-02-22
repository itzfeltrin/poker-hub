import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  buyIn: real("buy_in").notNull(),
  chipsPerPlayer: integer("chips_per_player").notNull(),
  finished: integer("finished", { mode: "boolean" }).notNull().default(false),
  location: text("location"),
});

export const gamePlayers = sqliteTable(
  "game_players",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    initialChips: integer("initial_chips").notNull(),
    finalChips: integer("final_chips"),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.playerId] })],
);

export type PlayerRow = typeof players.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type GamePlayerRow = typeof gamePlayers.$inferSelect;
