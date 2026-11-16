import { createHash } from "node:crypto";
import { accounts, getDb, sessions, users, verifications } from "@repo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { cloudinaryConfig } from "./cloudinary";
import { destroyUploadsOf } from "./services/listings";
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
 * from the request, so the production address, this deployment's own
 * addresses and localhost all work without a setting each.
 *
 * Every host here is also trusted by the sign-in library as somewhere a
 * request may come from and be sent back to after signing in. So the list
 * names this deployment's addresses exactly. It used to allow any
 * "*.vercel.app", which is every site anyone hosts there for free.
 */
function ownHosts(): string[] {
  const hosts = [
    "localhost:3000",
    new URL(siteUrl()).host,
    // Set by Vercel: the project's production address, and the addresses of this one
    // deployment and of its branch.
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ];
  return [...new Set(hosts.filter((host): host is string => Boolean(host)))];
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
      // requests are recognised without a trip to the database. The cookie is renewed by
      // the API's own answers (see the session check in app.ts).
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // The sign-in record Google issues is stored scrambled, not as plain text.
    account: { encryptOAuthTokens: true },
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
        delete: {
          // Whichever way an account is deleted (a guest checking out, or a signed-in person
          // deleting their account), the photos they uploaded are removed from the image store
          // first. Their flats go with the account; the photos live elsewhere and would stay.
          before: async (user) => {
            const storage = cloudinaryConfig();
            if (!storage) return;
            try {
              await destroyUploadsOf(db, user.id, storage);
            } catch (error) {
              // Never stand in the way of someone deleting their account.
              console.error("Could not remove an account's photos from storage", error);
            }
          },
        },
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
