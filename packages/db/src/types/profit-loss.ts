import { z } from "zod";

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
  players: z.array(ApiProfitLossPlayerSchema),
});

export type ApiProfitLoss = z.infer<typeof ApiProfitLossSchema>;
