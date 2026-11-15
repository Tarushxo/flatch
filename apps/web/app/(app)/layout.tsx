import Link from "next/link";
import type { ReactNode } from "react";
import { Ambient } from "@/components/ambient";
import { AppNav } from "@/components/app-shell/app-nav";
import { Logo } from "@/components/logo";
import { Providers } from "./providers";

/**
 * The signed-in app's frame. On a phone: logo on top, screen in the middle,
 * tab bar along the bottom. On a wide screen: a navigation rail down the left
 * and the screen beside it. The frame never scrolls; screens scroll inside it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="relative isolate flex h-dvh overflow-hidden">
        <Ambient />

        <aside className="hidden w-60 shrink-0 flex-col gap-10 border-hairline border-r px-5 py-6 lg:flex">
          <Link href="/" className="rounded-lg">
            <Logo size="sm" />
          </Link>
          <AppNav layout="rail" />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-center px-5 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
            <Link href="/" className="rounded-lg">
              <Logo size="sm" />
            </Link>
          </header>

          <main className="min-h-0 flex-1">{children}</main>

          <div className="shrink-0 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            <AppNav layout="bar" />
          </div>
        </div>
      </div>
    </Providers>
  );
}
