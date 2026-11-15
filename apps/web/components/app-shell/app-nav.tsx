"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, CardsIcon, KeyIcon, UserIcon } from "@/components/icons";

const TABS = [
  { href: "/discover", label: "Discover", icon: CardsIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon },
  { href: "/keys", label: "Keys", icon: KeyIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

/**
 * The app's main navigation, in the lit/unlit language of the logo: the
 * current tab is a lit tube, the others are dark glass.
 *
 * `bar` is the floating bar along the bottom of a phone. `rail` is the column
 * down the left of a wide screen.
 */
export function AppNav({ layout }: { layout: "bar" | "rail" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={
        layout === "bar"
          ? "surface mx-auto flex w-full max-w-sm gap-1 rounded-full p-1.5"
          : "flex flex-col gap-2"
      }
    >
      {TABS.map(({ href, label, icon: TabIcon }) => {
        const lit = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={lit ? "page" : undefined}
            className={`flex items-center font-medium transition-colors ${
              layout === "bar"
                ? "min-w-0 flex-1 flex-col gap-1 rounded-full px-1 py-2 text-[0.6875rem]"
                : "gap-3 rounded-xl px-3 py-2.5 text-sm"
            } ${lit ? "text-like" : "text-fg-3 hover:text-fg-2"}`}
          >
            <TabIcon
              key={lit ? "lit" : "unlit"}
              weight={lit ? "fill" : "regular"}
              className={`size-6 shrink-0 ${
                lit ? "animate-switch-on [filter:drop-shadow(0_0_6px_var(--like))]" : ""
              }`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
