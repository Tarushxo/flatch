import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/*
 * The connection to Postgres (Neon). A pool, because later milestones need
 * real transactions (like -> interest, accept -> conversation).
 */

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return Object.assign(drizzle(pool, { schema }), { close: () => pool.end() });
}

export type Db = ReturnType<typeof createDb>;

let shared: Db | null = null;

/** Whether this server has a database to talk to. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** The app's one connection pool, opened on first use. */
export function getDb(): Db {
  if (shared) return shared;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy it from Neon into .env.local (see .env.example).",
    );
  }
  shared = createDb(url);
  return shared;
}
