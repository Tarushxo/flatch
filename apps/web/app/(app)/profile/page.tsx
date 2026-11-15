import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <ComingSoon
      title="Check-in desk opens soon"
      body="Your profile and preferences will live here. Sign-in is built in a later milestone."
    />
  );
}
