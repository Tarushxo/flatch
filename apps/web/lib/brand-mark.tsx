/*
 * The brand mark: a dark building at night with one window lit, the app's
 * "flats are the lit windows" idea in its smallest form. Drawn with inline
 * styles and flexbox only, because it is rendered to an image by next/og
 * (for the tab icon, the home-screen icon and the share image), which
 * supports neither CSS classes nor grid.
 */

const INK = "#07070c";
const WALL = "#171722";
const DARK_WINDOW = "#2a2a3c";
const WARM = "#ffc53d";
const LIT = "#ff3da6";

// "." dark, "o" warm, "X" the lit one.
const FLOORS = ["o..", ".X.", "..o"];

export function BrandMark({ size }: { size: number }) {
  const radius = size * 0.22;
  const pad = size * 0.2;
  const gap = size * 0.07;
  const cell = (size - pad * 2 - gap * 2) / 3;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap,
        padding: pad,
        borderRadius: radius,
        background: `linear-gradient(160deg, ${WALL}, ${INK})`,
      }}
    >
      {FLOORS.map((floor) => (
        <div key={floor} style={{ display: "flex", gap }}>
          {[...floor].map((kind, column) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed three-cell row that never reorders
              key={column}
              style={{
                width: cell,
                height: cell,
                borderRadius: cell * 0.18,
                background: kind === "X" ? LIT : kind === "o" ? WARM : DARK_WINDOW,
                opacity: kind === "o" ? 0.55 : 1,
                boxShadow: kind === "X" ? `0 0 ${cell * 0.9}px ${LIT}` : "none",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
