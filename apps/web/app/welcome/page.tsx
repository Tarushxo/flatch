import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { WelcomeFlow } from "./welcome-flow";

export const metadata: Metadata = { title: "Check in" };

export default function WelcomePage() {
  return (
    <Providers>
      <WelcomeFlow />
    </Providers>
  );
}
