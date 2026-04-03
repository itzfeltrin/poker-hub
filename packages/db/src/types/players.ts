import { z } from "zod";

export const ApiPlayerSchema = z.object({
  id: z.uuid().optional().default(() => crypto.randomUUID()),
  name: z.string().min(1, "Name is required"),
});

export type ApiPlayer = z.infer<typeof ApiPlayerSchema>;

export const ApiPlayerCreateSchema = ApiPlayerSchema.pick({ name: true });
export type ApiPlayerCreate = z.infer<typeof ApiPlayerCreateSchema>;
