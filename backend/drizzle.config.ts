import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./node_modules/@poker-hub/db/src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "poker-hub.sqlite",
  },
});
