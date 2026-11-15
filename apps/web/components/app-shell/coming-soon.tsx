import { CoffeeCupDrawing } from "@/components/motifs/neon-drawing";

/** A placeholder for a screen that a later milestone builds. */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <CoffeeCupDrawing className="size-28 [--glow:var(--brand-b)]" />
        <h1 className="mt-5 font-display font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="mt-2 max-w-xs text-fg-2 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
