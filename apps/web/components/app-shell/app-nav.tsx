"use client";

import { type Mode, totalUnread } from "@repo/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  BookmarkIcon,
  BuildingsIcon,
  CardsIcon,
  KeyIcon,
  UserIcon,
} from "@/components/icons";
import { useApplicants } from "@/lib/lister/use-lister";
import { useMatches } from "@/lib/matches/use-matches";
import { useMode } from "@/lib/profile/use-mode";

/** Each side of the app has its own first two tabs; Keys and Profile are shared. */
const TABS = {
  tenant: [
    { href: "/discover", label: "Discover", icon: CardsIcon },
    { href: "/saved", label: "Saved", icon: BookmarkIcon },
    { href: "/keys", label: "Keys", icon: KeyIcon },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ],
  lister: [
    { href: "/listings", label: "Your flats", icon: BuildingsIcon },
    { href: "/interested", label: "Interested", icon: BellIcon },
    { href: "/keys", label: "Keys", icon: KeyIcon },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ],
} as const satisfies Record<Mode, readonly unknown[]>;

/**
 * The app's main navigation, in the lit/unlit language of the logo: the
 * current tab is a lit tube, the others are dark glass. The Keys tab carries
 * a badge when there are unread messages, and a lister's Interested tab one
 * for tenants waiting on an answer.
 *
 * `bar` is the floating bar along the bottom of a phone. `rail` is the column
 * down the left of a wide screen. The bar steps aside inside a chat and while
 * posting a flat, where the space belongs to the message box or the form.
 */
export function AppNav({ layout }: { layout: "bar" | "rail" }) {
  const pathname = usePathname();
  const mode = useMode();
  const matches = useMatches();
  const applicants = useApplicants({ enabled: mode === "lister" });
  const badges: Record<string, number> = {
    "/keys": totalUnread(matches.data ?? []),
    "/interested": mode === "lister" ? (applicants.data?.length ?? 0) : 0,
  };

  const needsTheSpace = pathname.startsWith("/keys/") || pathname === "/listings/new";
  if (layout === "bar" && needsTheSpace) return null;

  const nav = (
    <nav
      aria-label="Main"
      className={
        layout === "bar"
          ? "surface mx-auto flex w-full max-w-sm gap-1 rounded-full p-1.5"
          : "flex flex-col gap-2"
      }
    >
      {TABS[mode].map(({ href, label, icon: TabIcon }) => {
        const lit = pathname === href || pathname.startsWith(`${href}/`);
        const badge = badges[href] ?? 0;
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
            <span className="relative">
              <TabIcon
                key={lit ? "lit" : "unlit"}
                weight={lit ? "fill" : "regular"}
                className={`size-6 shrink-0 ${
                  lit ? "animate-switch-on [filter:drop-shadow(0_0_6px_var(--like))]" : ""
                }`}
              />
              {badge > 0 ? (
                <span className="absolute -top-1.5 -right-2.5 grid min-w-[1.125rem] place-items-center rounded-full bg-win px-1 font-semibold text-[0.625rem] text-ink leading-[1.125rem]">
                  {badge}
                  <span className="sr-only">{href === "/keys" ? " unread" : " waiting"}</span>
                </span>
              ) : null}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );

  if (layout === "rail") return nav;

  return (
    <div className="shrink-0 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      {nav}
    </div>
  );
}
