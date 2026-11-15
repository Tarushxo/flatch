import Link from "next/link";
import { Logo } from "./logo";

/** The header shared by every public page: the logo (links home) and the VACANCY sign. */
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="rounded-lg">
        <Logo />
      </Link>
      <span className="rounded-full border border-like/50 px-3 py-1 font-sign text-like text-xs tracking-[0.22em]">
        VACANCY
      </span>
    </header>
  );
}
