/**
 * The room's ambient light: two large soft pools of brand colour and a film
 * of grain. Purely decorative, fixed behind the page content.
 *
 * The pools are radial gradients, not blurred shapes. They look the same, but
 * a phone can draw a gradient far more cheaply than a 120-pixel blur.
 */
export function Ambient() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[45%] -left-[35%] size-[110vmax] animate-drift bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-a)_26%,transparent),transparent)]" />
      <div className="absolute -right-[40%] -bottom-[50%] size-[105vmax] animate-drift bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-b)_20%,transparent),transparent)] [animation-delay:-12s]" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
