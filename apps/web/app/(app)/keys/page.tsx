import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Keys" };

export default function KeysPage() {
  return (
    <ComingSoon
      title="No keys on the rack yet"
      body="When a lister likes you back, the key to that flat hangs here. Matching is built in a later milestone."
    />
  );
}
