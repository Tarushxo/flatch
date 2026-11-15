import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { createDb } from "./client";

/*
 * Brings the database up to date with the SQL files in ./migrations.
 * Run with `pnpm --filter @repo/db db:migrate`. Safe to run again: migrations
 * that have already been applied are skipped.
 */

// Schema changes go through a direct connection where there is one; the pooled one can refuse them.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Paste the Neon snippet into .env.local first.");
  process.exit(1);
}

const db = createDb(url);
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) });
  console.log("Database is up to date.");
} finally {
  await db.close();
}
