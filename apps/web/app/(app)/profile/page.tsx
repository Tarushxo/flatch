import type { Metadata } from "next";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { CoffeeCupDrawing } from "@/components/motifs/neon-drawing";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <ScreenMessage
      art={<CoffeeCupDrawing className="[--glow:var(--brand-b)]" />}
      title="Check-in desk opens soon"
      body="Your profile and preferences will live here. Sign-in is built in a later milestone."
    />
  );
}
