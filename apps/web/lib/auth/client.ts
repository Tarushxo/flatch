import { createAuthClient } from "better-auth/client";
import { anonymousClient } from "better-auth/client/plugins";

/*
 * The browser's side of sign-in. Nobody is asked to make an account: the
 * first time the app needs to know who it is talking to, it quietly starts a
 * guest session, kept in a cookie the page's scripts cannot read.
 */

export const authClient = createAuthClient({ plugins: [anonymousClient()] });

let ready: Promise<void> | null = null;

async function startSession(): Promise<void> {
  const current = await authClient.getSession();
  if (current.data) return;
  const guest = await authClient.signIn.anonymous();
  if (guest.error) throw new Error(guest.error.message ?? "Could not start a session.");
}

/** Resolves once this browser has a session, making a guest one if needed. */
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
