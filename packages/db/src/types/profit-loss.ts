import { z } from "zod/v4";

export const PeriodFilterSchema = z.enum([
  "last_7_days",
  "last_month",
  "last_year",
  "all_time",
  "custom",
]);
export type PeriodFilter = z.infer<typeof PeriodFilterSchema>;

export const ApiProfitLossPlayerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  totalBuyIn: z.number(),
  totalCashOut: z.number(),
  profitLoss: z.number(),
});

export type ApiProfitLossPlayer = z.infer<typeof ApiProfitLossPlayerSchema>;

export const ApiProfitLossSchema = z.object({
  period: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  groupId: z.union([z.uuid(), z.null()]),
  players: z.array(ApiProfitLossPlayerSchema),
});

export type ApiProfitLoss = z.infer<typeof ApiProfitLossSchema>;

export const ApiProfitLossSeriesPlayerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export type ApiProfitLossSeriesPlayer = z.infer<
  typeof ApiProfitLossSeriesPlayerSchema
>;

export const ApiProfitLossSeriesPointValueSchema = z.object({
  playerId: z.uuid(),
  profitLoss: z.number(),
});

export type ApiProfitLossSeriesPointValue = z.infer<
  typeof ApiProfitLossSeriesPointValueSchema
>;

export const ApiProfitLossSeriesPointSchema = z.object({
  date: z.string(),
  gameId: z.uuid(),
  values: z.array(ApiProfitLossSeriesPointValueSchema),
});

export type ApiProfitLossSeriesPoint = z.infer<
  typeof ApiProfitLossSeriesPointSchema
>;

export const ApiProfitLossSeriesSchema = z.object({
  period: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  groupId: z.union([z.uuid(), z.null()]),
  playerId: z.union([z.uuid(), z.null()]),
  players: z.array(ApiProfitLossSeriesPlayerSchema),
  points: z.array(ApiProfitLossSeriesPointSchema),
});

export type ApiProfitLossSeries = z.infer<typeof ApiProfitLossSeriesSchema>;
