import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { SignInScreen } from "./sign-in-screen";

export const metadata: Metadata = { title: "Front desk" };

export default function SignInPage() {
  return (
    <Providers>
      <SignInScreen />
    </Providers>
  );
}
