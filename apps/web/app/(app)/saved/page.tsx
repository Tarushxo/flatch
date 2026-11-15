import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <ComingSoon
      title="Still setting the table"
      body="Flats you swipe up on will be kept here. This screen is built in a later milestone."
    />
  );
}
