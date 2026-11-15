"use client";

import { totalUnread } from "@repo/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, CardsIcon, KeyIcon, UserIcon } from "@/components/icons";
import { useMatches } from "@/lib/matches/use-matches";

const TABS = [
  { href: "/discover", label: "Discover", icon: CardsIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon },
  { href: "/keys", label: "Keys", icon: KeyIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

/**
 * The app's main navigation, in the lit/unlit language of the logo: the
 * current tab is a lit tube, the others are dark glass. The Keys tab carries
 * a badge when there are unread messages.
 *
 * `bar` is the floating bar along the bottom of a phone. `rail` is the column
 * down the left of a wide screen. The bar steps aside inside a chat, where the
 * space belongs to the message box.
 */
export function AppNav({ layout }: { layout: "bar" | "rail" }) {
  const pathname = usePathname();
  const matches = useMatches();
  const unread = totalUnread(matches.data ?? []);

  const inChat = pathname.startsWith("/keys/");
  if (layout === "bar" && inChat) return null;

  const nav = (
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
        const badge = href === "/keys" && unread > 0 ? unread : 0;
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
                  <span className="sr-only"> unread</span>
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
