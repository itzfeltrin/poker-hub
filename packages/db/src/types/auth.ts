import { z } from "zod";

export const ApiLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type ApiLogin = z.infer<typeof ApiLoginSchema>;

export const ApiAuthOkSchema = z.object({
  ok: z.literal(true),
});

export type ApiAuthOk = z.infer<typeof ApiAuthOkSchema>;
