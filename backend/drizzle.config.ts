import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./node_modules/@poker-hub/db/src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // TODO: Consider adding ts env validation
    url: process.env.DATABASE_PATH as string,
  },
});
