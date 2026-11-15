import { createAuthClient } from "better-auth/client";
import { anonymousClient } from "better-auth/client/plugins";

/*
 * The browser's side of sign-in. A session is kept in a cookie the page's
 * scripts cannot read.
 *
 * Someone arriving without a session is sent to the front desk (/sign-in) to
 * choose: sign in with Google, or carry on with a guest pass. Where this
 * server has no Google sign-in to offer there is nothing to choose, and a
 * guest session is started quietly instead.
 */

export const authClient = createAuthClient({ plugins: [anonymousClient()] });

export type Entry = {
  /** Whether this browser is already signed in, as a guest or with an account. */
  hasSession: boolean;
  /** Whether this server offers Google sign-in. */
  canSignIn: boolean;
};

/** What the front desk needs to know about this browser. Starts nothing. */
export async function entryState(): Promise<Entry> {
  const [session, health] = await Promise.all([
    authClient.getSession(),
    fetch("/api/v1/health").then((response) => response.json() as Promise<{ google?: boolean }>),
  ]);
  return { hasSession: Boolean(session.data), canSignIn: Boolean(health.google) };
}

/** Start a guest session for this browser. */
export async function startGuestSession(): Promise<void> {
  const guest = await authClient.signIn.anonymous();
  if (guest.error) throw new Error(guest.error.message ?? "Could not start a session.");
  ready = Promise.resolve();
}

let ready: Promise<void> | null = null;

async function startSession(): Promise<void> {
  const entry = await entryState();
  if (entry.hasSession) return;
  if (!entry.canSignIn) return startGuestSession();

  // There is a choice to make, so it is the person's: hand them to the front desk, and
  // bring them back to this page afterwards. The page is leaving, so this never settles.
  const here = `${window.location.pathname}${window.location.search}`;
  window.location.replace(`/sign-in?next=${encodeURIComponent(here)}`);
  return new Promise<void>(() => {});
}

/** Resolves once this browser has a session. Without one, see the note at the top. */
export function ensureSession(): Promise<void> {
  ready ??= startSession().catch((error: unknown) => {
    // Let the next call try again, rather than remembering the failure.
    ready = null;
    throw error;
  });
  return ready;
}

/** Forget what is known about the session, so the next request checks afresh. */
export function forgetSession(): void {
  ready = null;
}
