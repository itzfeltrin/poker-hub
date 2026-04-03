import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  ApiGameWithPlayersSchema,
  gamePlayerBuyIns,
  gamePlayers,
  games,
  groupMembers,
  players,
} from "@poker-hub/db";
import * as R from "remeda";
import z from "zod";

const app = new Hono();

app.get("/", (c) => {
  const groupIdParsed = z.uuid().safeParse(c.req.query("groupId"));

  const filteredGames = groupIdParsed.success
    ? db
        .select()
        .from(games)
        .where(eq(games.groupId, groupIdParsed.data))
        .orderBy(desc(games.date))
        .all()
    : db.select().from(games).orderBy(desc(games.date)).all();

  const rows = R.pipe(
    filteredGames,
    R.map((game) => {
      const participants = db
        .select({
          playerId: groupMembers.playerId,
          name: players.name,
          cashOut: gamePlayers.cashOut,
        })
        .from(gamePlayers)
        .innerJoin(
          groupMembers,
          eq(gamePlayers.groupMemberId, groupMembers.id),
        )
        .innerJoin(players, eq(players.id, groupMembers.playerId))
        .where(eq(gamePlayers.gameId, game.id))
        .all();

      const buyInRows = db
        .select({
          playerId: groupMembers.playerId,
          chips: gamePlayerBuyIns.chips,
        })
        .from(gamePlayerBuyIns)
        .innerJoin(
          groupMembers,
          eq(gamePlayerBuyIns.groupMemberId, groupMembers.id),
        )
        .where(eq(gamePlayerBuyIns.gameId, game.id))
        .all();

      const buyInsByPlayer = R.groupBy(buyInRows, (b) => b.playerId);

      const gamePlayerRows = R.pipe(
        participants,
        R.map((p) => {
          const initialChips = R.sumBy(
            buyInsByPlayer[p.playerId] ?? [],
            (b) => b.chips,
          );
          return {
            id: p.playerId,
            name: p.name,
            initialChips,
            cashOut: p.cashOut,
          };
        }),
      );

      return {
        ...game,
        players: gamePlayerRows,
      };
    }),
  );

  const apiGamesWithPlayers = z.array(ApiGameWithPlayersSchema).safeParse(rows);
  if (!apiGamesWithPlayers.success) {
    return c.json(z.treeifyError(apiGamesWithPlayers.error), 400);
  }

  return c.json(apiGamesWithPlayers.data);
});

export default app;
