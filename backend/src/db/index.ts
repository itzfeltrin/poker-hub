import { Database } from "bun:sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const sqlite = new Database("poker-hub.sqlite", { create: true });
const db = drizzle(sqlite, { schema });

// Run pending migrations on startup (e.g. drizzle folder relative to cwd when run from backend/)
migrate(db, { migrationsFolder: "drizzle" });

export { db };
export { schema };
