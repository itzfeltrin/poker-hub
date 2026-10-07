import { z } from "zod/v4";

const CalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD");

export const ApiChampionshipSchema = z
  .object({
    id: z.uuid(),
    groupId: z.uuid(),
    name: z.string().min(1).max(100),
    startDate: CalendarDateSchema,
    endDate: CalendarDateSchema,
  })
  .refine((row) => row.startDate <= row.endDate, {
    message: "A data de início deve ser anterior ou igual à data de fim",
    path: ["endDate"],
  });

export type ApiChampionship = z.infer<typeof ApiChampionshipSchema>;

export const ApiChampionshipCreateSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().min(1).max(100),
    startDate: CalendarDateSchema,
    endDate: CalendarDateSchema,
  })
  .refine((row) => row.startDate <= row.endDate, {
    message: "A data de início deve ser anterior ou igual à data de fim",
    path: ["endDate"],
  });

export type ApiChampionshipCreate = z.infer<typeof ApiChampionshipCreateSchema>;

export const ApiChampionshipPatchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    startDate: CalendarDateSchema.optional(),
    endDate: CalendarDateSchema.optional(),
  })
  .refine(
    (row) =>
      !row.startDate || !row.endDate || row.startDate <= row.endDate,
    {
      message: "A data de início deve ser anterior ou igual à data de fim",
      path: ["endDate"],
    },
  );

export type ApiChampionshipPatch = z.infer<typeof ApiChampionshipPatchSchema>;

/** Inclusive UTC calendar-day bounds for SQL string compare on ISO `games.date`. */
export function championshipSqlBounds(startDate: string, endDate: string) {
  const [year, month, day] = endDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const toExclusive = next.toISOString().slice(0, 10);
  return { from: startDate, toExclusive };
}

export function calendarDateUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function championshipContainsDate(
  startDate: string,
  endDate: string,
  iso: string,
): boolean {
  const key = calendarDateUtc(iso);
  return key >= startDate && key <= endDate;
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
