import { z } from "zod";

export const ApiPlayerSchema = z.object({
  id: z.uuid().optional().default(crypto.randomUUID()),
  name: z.string().min(1, "Name is required"),
});

export type ApiPlayer = z.infer<typeof ApiPlayerSchema>;
