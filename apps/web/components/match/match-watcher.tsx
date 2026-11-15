"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useCelebrations } from "@/lib/matches/celebrations";
import { useMatches } from "@/lib/matches/use-matches";

// The match screen is only needed when a match happens, so it is fetched then.
const MatchMoment = dynamic(() => import("./match-moment").then((module) => module.MatchMoment), {
  ssr: false,
});

/**
 * Watches for new matches from anywhere in the app and shows the match moment
 * for each one, one at a time. Lives in the app's frame so it is always on.
 */
export function MatchWatcher() {
  const matches = useMatches();
  const next = useCelebrations((state) => state.queue[0]);
  const observe = useCelebrations((state) => state.observe);
  const dismiss = useCelebrations((state) => state.dismiss);

  useEffect(() => {
    if (matches.data) observe(matches.data);
  }, [matches.data, observe]);

  return next ? <MatchMoment key={next.id} match={next} onClose={dismiss} /> : null;
}
