import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
  },
  (t) => [
    uniqueIndex("group_members_group_player_unique").on(t.groupId, t.playerId),
  ],
);

export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  buyIn: real("buy_in").notNull(),
  chipsPerPlayer: integer("chips_per_player").notNull(),
  finished: integer("finished", { mode: "boolean" }).notNull().default(false),
  locationId: text("location_id").references(() => locations.id),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id),
});

export const gamePlayers = sqliteTable(
  "game_players",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    groupMemberId: text("group_member_id")
      .notNull()
      .references(() => groupMembers.id),
    cashOut: integer("cash_out"),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.groupMemberId] })],
);

export const gamePlayerBuyIns = sqliteTable("game_player_buy_ins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  groupMemberId: text("group_member_id")
    .notNull()
    .references(() => groupMembers.id),
  chips: integer("chips").notNull(),
  isInitial: integer("is_initial", { mode: "boolean" })
    .notNull()
    .default(false),
});

/** Append-only ledger per group member; balance = sum(amount_cents). BRL stored as centavos (100 = R$1). */
export const groupLedgerEntries = sqliteTable(
  "group_ledger_entries",
  {
    id: text("id").primaryKey(),
    groupMemberId: text("group_member_id")
      .notNull()
      .references(() => groupMembers.id),
    /** Positive = player gained / is owed; negative = player lost / owes the group tab. */
    amountCents: integer("amount_cents").notNull(),
    /** `game` = resultado da partida; `payment` = pagamento/recebimento registrado fora do app; `manual` = ajuste. */
    transactionType: text("transaction_type").notNull(),
    gameId: text("game_id").references(() => games.id),
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("group_ledger_entries_group_member_idx").on(t.groupMemberId),
    index("group_ledger_entries_game_idx").on(t.gameId),
  ],
);

export type PlayerRow = (typeof players)["$inferSelect"];
export type LocationRow = (typeof locations)["$inferSelect"];
export type GroupRow = (typeof groups)["$inferSelect"];
export type GroupMemberRow = (typeof groupMembers)["$inferSelect"];
export type GameRow = (typeof games)["$inferSelect"];
export type GamePlayerRow = (typeof gamePlayers)["$inferSelect"];
export type GamePlayerBuyInRow = (typeof gamePlayerBuyIns)["$inferSelect"];
export type GroupLedgerEntryRow = (typeof groupLedgerEntries)["$inferSelect"];
