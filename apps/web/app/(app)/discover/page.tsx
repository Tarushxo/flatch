import type { Metadata } from "next";
import { DiscoverScreen } from "./discover-screen";

export const metadata: Metadata = { title: "Discover" };

// The first card's photo is fetched early by the head-start script in the app's
// layout (lib/start), which knows whose deck it is. This page used to guess at
// the photo itself, and guessed wrong for anyone whose deck is ranked for them.
export default function DiscoverPage() {
  return <DiscoverScreen />;
}
