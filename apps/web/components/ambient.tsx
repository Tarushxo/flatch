/**
 * The room's ambient light: two large soft pools of brand colour and a film
 * of grain. Purely decorative, fixed behind the page content.
 *
 * The pools are radial gradients, not blurred shapes. They look the same, but
 * a phone can draw a gradient far more cheaply than a 120-pixel blur.
 *
 * On the landing and other quiet pages the pools drift slowly. Pass `still`
 * where something else is moving, such as the swipe deck.
 */
export function Ambient({ still = false }: { still?: boolean }) {
  // Inside the app the pools stand still. Drifting, they make the phone redraw two
  // screen-sized layers on every frame for as long as the app is open, under the deck.
  const drift = still ? "" : "animate-drift";
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className={`absolute -top-[45%] -left-[35%] size-[110vmax] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-a)_26%,transparent),transparent)] ${drift}`}
      />
      <div
        className={`absolute -right-[40%] -bottom-[50%] size-[105vmax] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-b)_20%,transparent),transparent)] [animation-delay:-12s] ${drift}`}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
}
