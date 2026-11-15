/**
 * The room's ambient light: two large blurred pools of brand colour and a film
 * of grain. Purely decorative, fixed behind the page content.
 */
export function Ambient() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[30%] -left-[20%] h-[70vmax] w-[70vmax] animate-drift rounded-full bg-brand-a/20 blur-[120px]" />
      <div className="absolute -right-[25%] -bottom-[35%] h-[65vmax] w-[65vmax] animate-drift rounded-full bg-brand-b/15 blur-[130px] [animation-delay:-12s]" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
