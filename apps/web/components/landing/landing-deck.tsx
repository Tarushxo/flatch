"use client";

import { useRouter } from "next/navigation";
import { SwipeDeck } from "@/components/deck/swipe-deck";
import { Providers } from "@/components/providers";

/**
 * The real swipe deck, running on the landing page as a teaser. It shares its
 * state with the app, so flats swiped here stay swiped after "Start swiping".
 * Asking for details takes the visitor into the app.
 */
export function LandingDeck() {
  const router = useRouter();

  return (
    <Providers>
      <div className="h-[36rem] w-full max-w-[22rem]">
        <SwipeDeck variant="teaser" onOpenDetails={() => router.push("/discover")} />
      </div>
    </Providers>
  );
}
