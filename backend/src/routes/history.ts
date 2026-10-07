import { Hono } from "hono";
import { desc, eq, isNull, and } from "drizzle-orm";
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
import { z } from "zod/v4";
import { getChampionship } from "../championships";

const app = new Hono();

app.get("/", (c) => {
  const groupIdParsed = z.uuid().safeParse(c.req.query("groupId"));
  const championshipIdParsed = z.uuid().safeParse(c.req.query("championshipId"));

  let groupId = groupIdParsed.success ? groupIdParsed.data : undefined;

  if (championshipIdParsed.success) {
    if (!groupId) {
      return c.json(
        { error: "groupId is required when filtering by championship" },
        400,
      );
    }
    const championship = getChampionship(groupId, championshipIdParsed.data);
    if (!championship) {
      return c.json({ error: "Campeonato não encontrado" }, 404);
    }
  }

  const conditions = [isNull(games.deletedAt)];
  if (groupId) conditions.push(eq(games.groupId, groupId));
  if (championshipIdParsed.success) {
    conditions.push(eq(games.championshipId, championshipIdParsed.data));
  }

  const filteredGames = db
    .select()
    .from(games)
    .where(and(...conditions))
    .orderBy(desc(games.date))
    .all();

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
