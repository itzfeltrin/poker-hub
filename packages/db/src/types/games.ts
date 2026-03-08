import { z } from "zod";
import { ApiPlayerSchema } from "./players";

export const ApiGameSchema = z.object({
  id: z.uuid().optional().default(() => crypto.randomUUID()),
  date: z.string(),
  buyIn: z.number().positive("Buy-in must be a positive number"),
  chipsPerPlayer: z
    .number()
    .positive("Chips per player must be a positive number"),
  playerIds: z
    .array(z.uuid("Player ID must be a valid UUID"))
    .min(1, "Player IDs must be a non-empty array of player IDs"),
  location: z.string().optional(),
  finished: z.boolean().optional().default(false),
});

export type ApiGame = z.infer<typeof ApiGameSchema>;

export const ApiGamePlayerSchema = ApiPlayerSchema.extend({
  initialChips: z.number().positive("Initial chips must be a positive number"),
  cashOut: z
    .number()
    .min(0, "Cash out must be a non-negative number")
    .nullable(),
});

export type ApiGamePlayer = z.infer<typeof ApiGamePlayerSchema>;

export const ApiGameWithPlayersSchema = ApiGameSchema.extend({
  players: z.array(ApiGamePlayerSchema),
}).omit({ playerIds: true });

export type ApiGameWithPlayers = z.infer<typeof ApiGameWithPlayersSchema>;

export const FinalizeGameBodySchema = z.object({
  cashOut: z.record(z.uuid(), z.number().min(0)),
});
export type FinalizeGameBody = z.infer<typeof FinalizeGameBodySchema>;

export const ApiGameBuyInCreateSchema = z.object({
  playerId: z.uuid("Player ID must be a valid UUID"),
  chips: z
    .number()
    .positive("Chips must be a positive number")
    .optional(),
});

export type ApiGameBuyInCreate = z.infer<typeof ApiGameBuyInCreateSchema>;
