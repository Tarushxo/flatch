"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck/store";
import { useProfile } from "@/lib/profile/use-profile";

/** Remembers that the prompt has been shown, so it is never shown twice in a browser. */
const ASKED_KEY = "flatch.name-prompt.v1";

/**
 * The first time someone likes a flat without having given a name, they are
 * asked once, gently, whether they want to add one. Asking at this moment
 * rather than up front is deliberate: nobody has to fill in a profile to look
 * around, and the question arrives when it starts to matter.
 */
export function FirstLikePrompt() {
  const router = useRouter();
  const last = useDeckStore((state) => state.last);
  const profile = useProfile();
  const nameless = profile.data ? profile.data.name.trim() === "" : false;
  const action: string | undefined = last?.swipe.action;

  useEffect(() => {
    if (!nameless || (action !== "like" && action !== "superlike")) return;
    try {
      if (window.localStorage.getItem(ASKED_KEY)) return;
      window.localStorage.setItem(ASKED_KEY, "1");
    } catch {
      // Storage is blocked, so there is no way to ask only once. Better not to ask at all.
      return;
    }
    toast("Liked. Want to add your name?", {
      description: "The lister sees who liked their flat, so a name helps.",
      duration: 9000,
      action: { label: "Add it", onClick: () => router.push("/profile") },
    });
  }, [nameless, action, router]);

  return null;
}
