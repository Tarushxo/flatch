import type { Metadata } from "next";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { KeyDrawing } from "@/components/motifs/neon-drawing";

export const metadata: Metadata = { title: "Keys" };

export default function KeysPage() {
  return (
    <ScreenMessage
      art={<KeyDrawing className="[--glow:var(--win)]" />}
      title="No keys on the rack yet"
      body="When a lister likes you back, the key to that flat hangs here. Matching is built in a later milestone."
    />
  );
}
