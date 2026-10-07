import { and, eq, isNull, ne } from "drizzle-orm";
import {
  ApiChampionshipSchema,
  championshipContainsDate,
  championships,
  games,
  groups,
  rangesOverlap,
  type ApiChampionship,
} from "@poker-hub/db";
import { db } from "./db";

export function listChampionships(groupId: string): ApiChampionship[] {
  return db
    .select()
    .from(championships)
    .where(eq(championships.groupId, groupId))
    .all()
    .slice()
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((row) => ApiChampionshipSchema.parse(row));
}

export function getChampionship(
  groupId: string,
  championshipId: string,
): ApiChampionship | undefined {
  const row = db
    .select()
    .from(championships)
    .where(
      and(
        eq(championships.id, championshipId),
        eq(championships.groupId, groupId),
      ),
    )
    .get();
  return row ? ApiChampionshipSchema.parse(row) : undefined;
}

export function championshipOverlapsOther(
  groupId: string,
  startDate: string,
  endDate: string,
  exceptId?: string,
): boolean {
  const rows = exceptId
    ? db
        .select()
        .from(championships)
        .where(
          and(
            eq(championships.groupId, groupId),
            ne(championships.id, exceptId),
          ),
        )
        .all()
    : db
        .select()
        .from(championships)
        .where(eq(championships.groupId, groupId))
        .all();
  return rows.some((row) =>
    rangesOverlap(startDate, endDate, row.startDate, row.endDate),
  );
}

export function championshipMatchingDate(
  groupId: string,
  isoDate: string,
): ApiChampionship | undefined {
  return listChampionships(groupId).find((row) =>
    championshipContainsDate(row.startDate, row.endDate, isoDate),
  );
}

/** `undefined` infers from date; `null` leaves the game unassigned. */
export function resolveGameChampionshipId(
  groupId: string,
  isoDate: string,
  requested: string | null | undefined,
): { ok: true; id: string | null } | { ok: false; error: string } {
  if (requested === null) return { ok: true, id: null };
  if (requested !== undefined) {
    const row = getChampionship(groupId, requested);
    if (!row) {
      return { ok: false, error: "Campeonato não encontrado neste grupo" };
    }
    return { ok: true, id: row.id };
  }
  return { ok: true, id: championshipMatchingDate(groupId, isoDate)?.id ?? null };
}

export function backfillGameChampionships() {
  const unassigned = db
    .select({
      id: games.id,
      groupId: games.groupId,
      date: games.date,
    })
    .from(games)
    .where(isNull(games.championshipId))
    .all();
  for (const game of unassigned) {
    const match = championshipMatchingDate(game.groupId, game.date);
    if (!match) continue;
    db.update(games)
      .set({ championshipId: match.id })
      .where(eq(games.id, game.id))
      .run();
  }
}

export function insertDefaultChampionship(
  groupId: string,
  year = new Date().getUTCFullYear(),
) {
  const name = `Campeonato ${year}`;
  const existing = db
    .select()
    .from(championships)
    .where(
      and(eq(championships.groupId, groupId), eq(championships.name, name)),
    )
    .get();
  if (existing) return existing;
  if (listChampionships(groupId).length > 0) return undefined;

  const row = {
    id: crypto.randomUUID(),
    groupId,
    name,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
  db.insert(championships).values(row).run();
  return row;
}

export function seedDefaultChampionships() {
  const year = 2026;
  const allGroups = db.select({ id: groups.id }).from(groups).all();
  for (const group of allGroups) {
    insertDefaultChampionship(group.id, year);
  }
}
