import { Database } from "bun:sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "@poker-hub/db/schema";

const databasePath = process.env.DATABASE_PATH ?? "poker-hub.sqlite";
const sqlite = new Database(databasePath, { create: true });
const db = drizzle(sqlite, { schema });

// Run pending migrations on startup (e.g. drizzle folder relative to cwd when run from backend/)
migrate(db, { migrationsFolder: "drizzle" });

export { db };
export { schema };
