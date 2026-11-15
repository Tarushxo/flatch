"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ambient } from "@/components/ambient";
import { GoogleIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { BellDrawing } from "@/components/motifs/neon-drawing";
import { api } from "@/lib/api/client";
import { DEFAULT_NEXT, safeNext } from "@/lib/auth/next-path";

/**
 * The front desk: the first thing a new visitor meets after "Start swiping".
 * Two ways in, and the choice is theirs: sign in with Google, or take a guest
 * pass and decide later. Someone who already has a session, or a server with
 * no sign-in to offer, is waved straight through.
 */
export function SignInScreen() {
  const router = useRouter();
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "guest" | null>(null);
  const entry = useQuery({
    queryKey: ["entry"],
    queryFn: () => api.getEntry(),
    // Always asked afresh: the answer changes the moment someone signs in or out.
    staleTime: 0,
    gcTime: 0,
  });

  // The page to go on to is in the address; it is read here, in the browser.
  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  const nothingToChoose = entry.data ? entry.data.hasSession || !entry.data.canSignIn : false;

  useEffect(() => {
    if (nothingToChoose && next) router.replace(next);
  }, [nothingToChoose, next, router]);

  async function withGoogle() {
    setBusy("google");
    try {
      await api.signInWithGoogle(next ?? DEFAULT_NEXT);
    } catch {
      setBusy(null);
      toast.error("Couldn't reach Google just now. Try again, or carry on as a guest.");
    }
  }

  async function asGuest() {
    setBusy("guest");
    try {
      await api.continueAsGuest();
      router.replace(next ?? DEFAULT_NEXT);
    } catch {
      setBusy(null);
      toast.error("Couldn't start your guest pass. Try again in a moment.");
    }
  }

  if (entry.isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display font-semibold text-xl">The front desk isn't answering</p>
          <p className="mt-2 text-fg-2 text-sm">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => void entry.refetch()}
            className="mt-5 rounded-full border border-hairline bg-surface-2 px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fg/10"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!entry.data || next === null || nothingToChoose) {
    return (
      <div role="status" className="grid min-h-dvh place-items-center">
        <span className="sr-only">Loading…</span>
        <MarqueeBulbs total={6} chase />
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <Ambient />

      <header className="mx-auto flex w-full max-w-md items-center justify-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link href="/" className="rounded-lg">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <BellDrawing className="size-24 [--glow:var(--save)]" />
        <p className="mt-6 font-sign text-fg-3 text-xs uppercase tracking-[0.24em]">Front desk</p>
        <h1 className="mt-3 text-balance font-display font-semibold text-3xl tracking-tight">
          How would you like to check in?
        </h1>
        <p className="mt-3 text-pretty text-fg-2">
          Sign in to keep your flats and chats on any device, or take a guest pass and decide later.
        </p>

        <div className="mt-9 flex w-full flex-col gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void withGoogle()}
            className="button-primary flex w-full items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <GoogleIcon className="size-5" />
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void asGuest()}
            className="w-full rounded-full border border-hairline bg-surface-2 px-6 py-3.5 font-medium transition-colors hover:bg-fg/10 disabled:opacity-50"
          >
            {busy === "guest" ? "Writing your pass…" : "Continue as a guest"}
          </button>
        </div>

        <p className="mt-6 max-w-xs text-fg-3 text-xs leading-relaxed">
          A guest pass lives in this browser only. You can sign in later from your profile and keep
          everything you did as a guest.
        </p>
      </main>
    </div>
  );
}
