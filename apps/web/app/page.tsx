import Link from "next/link";
import { Ambient } from "@/components/ambient";
import { ArrowRightIcon } from "@/components/icons";
import { PreviewCard } from "@/components/preview-card";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main className="relative isolate mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
      <Ambient />

      <SiteHeader />

      <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:py-16">
        <section className="max-w-xl">
          <h1 className="text-balance font-display font-semibold text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.02] tracking-tight">
            Swipe right on your next flat.
          </h1>
          <p className="mt-6 max-w-md text-pretty text-fg-2 text-lg leading-relaxed">
            Flats on one side, flatmates on the other. Swipe through homes that fit your budget,
            your commute and how you live. When the lister likes you back, you match and chat.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/discover"
              className="rounded-full bg-gradient-to-r from-brand-a to-brand-b px-7 py-3.5 font-semibold text-white shadow-[0_8px_32px_-8px_var(--brand-b)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              Start swiping
            </Link>
            <Link
              href="/styleguide"
              className="group inline-flex items-center gap-1.5 font-medium text-like text-sm"
            >
              See the design tokens
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <PreviewCard />
        </section>
      </div>
    </main>
  );
}
