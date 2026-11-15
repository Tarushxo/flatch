import Link from "next/link";
import type { ReactNode } from "react";
import { Ambient } from "@/components/ambient";
import { SiteHeader } from "@/components/site-header";

/**
 * The frame for the plain-words pages (privacy, terms): the site header, a
 * title, the date the page last changed, and readable text.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** When the page last changed, as people write dates: "15 November 2026". */
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate min-h-dvh">
      <Ambient />
      <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-16 sm:px-8">
        <SiteHeader />
        <main className="mt-12">
          <p className="font-sign text-fg-3 text-xs uppercase tracking-[0.24em]">House rules</p>
          <h1 className="mt-3 font-display font-semibold text-4xl tracking-tight">{title}</h1>
          <p className="mt-2 text-fg-3 text-sm">Last updated {updated}</p>
          <div className="mt-8 space-y-9">{children}</div>
        </main>
        <footer className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-hairline border-t pt-6 text-fg-3 text-sm">
          <Link href="/" className="transition-colors hover:text-fg">
            Home
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-fg">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-fg">
            Terms
          </Link>
        </footer>
      </div>
    </div>
  );
}

/** One headed part of a plain-words page. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-semibold text-xl tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-fg-2 leading-relaxed [&_a]:text-like [&_a]:underline-offset-4 hover:[&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-fg [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
