import type { Metadata } from "next";
import Link from "next/link";
import { Ambient } from "@/components/ambient";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { ArrowSignDrawing } from "@/components/motifs/neon-drawing";

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
        <Link
          href="/"
          className="inline-block rounded-full bg-gradient-to-r from-brand-a to-brand-b px-6 py-3 font-semibold text-sm text-white"
        >
          Back to the start
        </Link>
      </ScreenMessage>
    </main>
  );
}
