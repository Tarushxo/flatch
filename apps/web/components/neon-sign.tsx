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
 */
export function NeonSign({
  text,
  faultyLetter = 2,
  className = "",
}: {
  text: string;
  /** Position of the letter with the loose connection. Pass -1 for none. */
  faultyLetter?: number;
  className?: string;
}) {
  const letters = Array.from(text, (char, position) => ({ char, id: `${position}-${char}` }));

  return (
    <span className={`relative inline-block whitespace-pre font-sign ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="sign-unlit">
        {text}
      </span>
      <span aria-hidden="true" className="sign absolute inset-0 animate-neon">
        {letters.map((letter, position) => (
          <span
            key={letter.id}
            className={position === faultyLetter ? "inline-block animate-neon-faulty" : undefined}
          >
            {letter.char}
          </span>
        ))}
      </span>
    </span>
  );
}
