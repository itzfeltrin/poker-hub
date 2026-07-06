import { z } from "zod";

/** Origem da linha: partida, pagamento fora do app, ou ajuste manual. */
export const GroupLedgerTransactionTypeSchema = z.enum([
  "game",
  "payment",
  "manual",
]);

export type GroupLedgerTransactionType = z.infer<
  typeof GroupLedgerTransactionTypeSchema
>;

export const ApiGroupLedgerEntrySchema = z.object({
  id: z.uuid(),
  groupMemberId: z.uuid(),
  /** BRL in centavos (e.g. 1050 = R$ 10.50). */
  amountCents: z.number().int(),
  transactionType: GroupLedgerTransactionTypeSchema,
  gameId: z.uuid().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export type ApiGroupLedgerEntry = z.infer<typeof ApiGroupLedgerEntrySchema>;

export const ApiGroupLedgerEntryCreateSchema = z.object({
  id: z.uuid().optional(),
  groupMemberId: z.uuid(),
  amountCents: z.number().int(),
  transactionType: GroupLedgerTransactionTypeSchema,
  gameId: z.uuid().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type ApiGroupLedgerEntryCreate = z.infer<
  typeof ApiGroupLedgerEntryCreateSchema
>;

/** Row returned by GET ledger (includes player name for UI). */
export const ApiGroupLedgerEntryWithPlayerSchema =
  ApiGroupLedgerEntrySchema.extend({
    playerName: z.string(),
    playerId: z.uuid(),
  });

export type ApiGroupLedgerEntryWithPlayer = z.infer<
  typeof ApiGroupLedgerEntryWithPlayerSchema
>;

export const ApiGroupMemberBalanceSchema = z.object({
  groupMemberId: z.uuid(),
  playerId: z.uuid(),
  playerName: z.string(),
  balanceCents: z.number().int(),
});

export type ApiGroupMemberBalance = z.infer<typeof ApiGroupMemberBalanceSchema>;

export const ApiGroupLedgerSnapshotSchema = z.object({
  balances: z.array(ApiGroupMemberBalanceSchema),
  entries: z.array(ApiGroupLedgerEntryWithPlayerSchema),
});

export type ApiGroupLedgerSnapshot = z.infer<typeof ApiGroupLedgerSnapshotSchema>;

const ledgerNoteSchema = z.string().max(500).nullable().optional();

/** POST from UI: only payment or manual (game lines are created by the server when finalizing games). */
export const ApiGroupLedgerManualCreateSchema = z.discriminatedUnion(
  "transactionType",
  [
    z.object({
      transactionType: z.literal("manual"),
      groupMemberId: z.uuid(),
      amountCents: z.number().int(),
      note: ledgerNoteSchema,
    }),
    z.object({
      transactionType: z.literal("payment"),
      /** Player who paid (balance should be negative). */
      groupMemberId: z.uuid(),
      /** Player who received the money (balance should be positive). */
      counterpartyGroupMemberId: z.uuid(),
      amountCents: z.number().int().positive(),
      note: ledgerNoteSchema,
    }),
  ],
);

export type ApiGroupLedgerManualCreate = z.infer<
  typeof ApiGroupLedgerManualCreateSchema
>;

export const ApiGroupLedgerCreateResultSchema = z.object({
  entries: z.array(ApiGroupLedgerEntryWithPlayerSchema),
});

export type ApiGroupLedgerCreateResult = z.infer<
  typeof ApiGroupLedgerCreateResultSchema
>;

export { maxPeerPaymentCents } from "../peer-payment";
