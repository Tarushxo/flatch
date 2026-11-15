import { createHash } from "node:crypto";
import { accounts, getDb, sessions, users, verifications } from "@repo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { moveGuestData } from "./services/me";

/*
 * Sign-in, handled by Better Auth. Everyone gets an account the moment they
 * need one: a guest account, made silently, which lives in one browser. Signing
 * in with Google turns it into a real account and carries the guest's swipes
 * and profile across.
 *
 * Google sign-in is only offered when its two keys are set (see .env.example).
 */

/** Whether this server can offer Google sign-in. */
export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The key that signs session cookies. Set BETTER_AUTH_SECRET to choose it.
 * Without one it is worked out from the database address, which is already a
 * long secret that only the server knows, so a fresh deployment works without
 * another setting to remember. Changing either signs everyone out.
 */
function signingSecret(): string {
  const chosen = process.env.BETTER_AUTH_SECRET;
  if (chosen) return chosen;
  const database = process.env.DATABASE_URL;
  if (!database) throw new Error("Sign-in needs BETTER_AUTH_SECRET or DATABASE_URL to be set.");
  return createHash("sha256").update(`flatch-session-signing:${database}`).digest("base64url");
}

/** The address to assume when a request does not say which host it came to. */
function siteUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * The hosts this site may be reached at. Sign-in works out its own address
 * from the request, so the production address, preview deployments and
 * localhost all work without a setting each. A request is only ever compared
 * with the host it arrived at, so this does not let another site in.
 */
function ownHosts(): string[] {
  const hosts = ["localhost:3000", new URL(siteUrl()).host];
  if (process.env.VERCEL) hosts.push("*.vercel.app");
  return [...new Set(hosts)];
}

function createAuth() {
  const db = getDb();
  return betterAuth({
    baseURL: { allowedHosts: ownHosts(), fallback: siteUrl() },
    secret: signingSecret(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    // Ids are UUIDs, like every other id in the database.
    advanced: { database: { generateId: "uuid" } },
    session: {
      // The session is also kept, signed, in a cookie for a few minutes, so most
      // requests are recognised without a trip to the database.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    user: {
      // "Check out" and "Delete account" remove the person and everything of theirs.
      deleteUser: { enabled: true },
    },
    socialProviders: googleEnabled()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : {},
    databaseHooks: {
      user: {
        create: {
          // A guest has no name until they give one. (The library would call them "Anonymous".)
          before: async (user) => ({
            data: (user as { isAnonymous?: boolean }).isAnonymous ? { ...user, name: "" } : user,
          }),
        },
      },
    },
    plugins: [
      anonymous({
        emailDomainName: "guest.flatch.invalid",
        // When a guest signs in, what they did as a guest goes with them.
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await moveGuestData(db, anonymousUser.user.id, newUser.user.id);
        },
      }),
    ],
  });
}

let shared: ReturnType<typeof createAuth> | null = null;

/** The sign-in engine, made on first use so that building the site needs no secrets. */
export function getAuth() {
  shared ??= createAuth();
  return shared;
}
