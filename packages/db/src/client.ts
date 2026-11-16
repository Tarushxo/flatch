import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/*
 * The connection to Postgres (Neon). A pool, because several writes are real
 * transactions (a swipe with its like, an answer with the chat it opens).
 */

export function createDb(connectionString: string) {
  const pool = new Pool({
    connectionString,
    // A handful is plenty for one server instance, and the free database allows few.
    max: 5,
    // Never wait for ever on a connection that will not open (the database waking, or a
    // bad network path): fail in a few seconds, with an error the request can report.
    connectionTimeoutMillis: 8_000,
  });
  // A connection that drops while idle reports here. With nobody listening, that is an
  // unhandled error, which can take the whole server instance down.
  pool.on("error", (error: Error) => {
    console.error("A database connection was lost while idle", error.message);
  });
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
