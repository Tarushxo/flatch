import type { Metadata } from "next";
import { SavedFlats } from "./saved-flats";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return <SavedFlats />;
}
