import type { Metadata } from "next";
import { Ambient } from "@/components/ambient";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { ArrowSignDrawing } from "@/components/motifs/neon-drawing";
import { SignLink } from "@/components/sign-link";

export const metadata: Metadata = { title: "Wrong turn" };

export default function NotFound() {
  return (
    <main className="relative isolate h-dvh">
      <Ambient />
      <ScreenMessage
        art={<ArrowSignDrawing className="[--glow:var(--pass)]" />}
        title="Wrong turn"
        body="There is nothing down this road. Head back to the sign and start again."
      >
        <SignLink href="/" size="sm">
          Back to the start
        </SignLink>
      </ScreenMessage>
    </main>
  );
}
