import { app } from "@repo/api";
import { handle } from "hono/vercel";

/*
 * The API lives in packages/api as a plain Hono app; this file only mounts it
 * inside Next, so the app and its API share one address and one deployment.
 */

// Postgres connections need the full Node runtime, not the edge one.
export const runtime = "nodejs";

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
