const FONTS = {
  /** Clean tube lettering, for stamps and signs. */
  sign: "font-sign",
  /** The retro script used only by the logo. */
  logo: "font-logo",
} as const;

/**
 * Neon-tube lettering that behaves like an old motel sign: it flickers on when
 * the page loads, then every so often the whole sign buzzes, and one letter
 * has a loose connection of its own.
 *
 * Two layers are stacked. The bottom one is the unlit glass tube, always
 * visible. The top one is the lit gas, and only its opacity is animated, so a
 * "flicker" shows the dark tube underneath the way a real sign does.
 *
 * Set the colour with `--glow` (for example `[--glow:var(--brand-b)]`).
 * People who prefer reduced motion get a steady, fully lit sign.
 *
 * For the product logo, use `<Logo />` instead of calling this directly.
 */
export function NeonSign({
  text,
  font = "sign",
  faultyLetter = 2,
  lit = true,
  className = "",
}: {
  text: string;
  font?: keyof typeof FONTS;
  /** Position of the letter with the loose connection. Pass -1 for none. */
  faultyLetter?: number;
  /** False shows the sign switched off: only the dark glass tube. Switching it on flickers. */
  lit?: boolean;
  className?: string;
}) {
  const letters = Array.from(text, (char, position) => ({ char, id: `${position}-${char}` }));

  return (
    <span className={`relative inline-block whitespace-pre ${FONTS[font]} ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="sign-unlit">
        {text}
      </span>
      {/* Letters stay inline (not inline-block) so a script font keeps its joins. */}
      <span
        aria-hidden="true"
        className={`sign absolute inset-0 transition-opacity duration-150 ${lit ? "animate-neon" : "opacity-0"}`}
      >
        {letters.map((letter, position) => (
          <span
            key={letter.id}
            className={position === faultyLetter ? "animate-neon-faulty" : undefined}
          >
            {letter.char}
          </span>
        ))}
      </span>
    </span>
  );
}
