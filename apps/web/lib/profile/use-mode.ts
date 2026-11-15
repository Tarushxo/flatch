"use client";

import type { Mode } from "@repo/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { PROFILE_KEY, useProfile } from "./use-profile";

/** Where each side of the app starts. */
export const HOME: Record<Mode, string> = { tenant: "/discover", lister: "/listings" };

/** Which side of the app is in use: looking for a flat, or listing one. */
export function useMode(): Mode {
  return useProfile().data?.mode ?? "tenant";
}

/**
 * Switch sides and go to that side's first screen. Someone who has not
 * checked in yet is checked in on the way, so a lister never has to answer a
 * tenant's questions.
 */
export function useSwitchMode() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);

  async function switchTo(mode: Mode) {
    setSwitching(true);
    try {
      const current = await api.getProfile();
      const saved = await api.saveProfile({
        ...current,
        mode,
        onboardedAt: current.onboardedAt ?? new Date().toISOString(),
      });
      queryClient.setQueryData(PROFILE_KEY, saved);
      router.push(HOME[mode]);
    } catch {
      toast.error("Couldn't switch just now. Try again in a moment.");
    } finally {
      setSwitching(false);
    }
  }

  return { switchTo, switching };
}
