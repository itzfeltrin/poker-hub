import { z } from "zod";

export const ApiLocationSchema = z.object({
  id: z
    .uuid()
    .optional()
    .default(() => crypto.randomUUID()),
  name: z.string().min(1, "Name is required").max(100),
});

export type ApiLocation = z.infer<typeof ApiLocationSchema>;
