"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "flatch.deck-hints.v1";

const DIRECTIONS = [
  {
    arrow: "↑",
    label: "Save",
    colour: "var(--save)",
    place: "top-[12%] left-1/2 -translate-x-1/2",
  },
  {
    arrow: "→",
    label: "Like",
    colour: "var(--like)",
    place: "top-1/2 right-[7%] -translate-y-1/2",
  },
  {
    arrow: "↓",
    label: "Details",
    colour: "var(--brand-a)",
    place: "bottom-[30%] left-1/2 -translate-x-1/2",
  },
  { arrow: "←", label: "Pass", colour: "var(--pass)", place: "top-1/2 left-[7%] -translate-y-1/2" },
];

/**
 * A one-time overlay on the first card that shows the four swipes. It is
 * remembered in the browser, so a returning visitor never sees it again.
 * Any tap, drag or key dismisses it.
 */
export function DeckHints() {
  const [show, setShow] = useState(false);

  // Decide after mount: the server cannot know what this browser has seen.
  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(SEEN_KEY) === null);
    } catch {
      // Storage is blocked (private mode, strict settings): skip the hints.
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const dismiss = () => {
      setShow(false);
      try {
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Not remembered; the hints will show again next visit.
      }
    };
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 animate-fade-in rounded-[2rem] bg-ink/75 backdrop-blur-[2px]">
      <p className="sr-only">
        Swipe right to like, left to pass, up to save and down for details. Tap the sides of a photo
        to see more photos.
      </p>
      <div aria-hidden="true">
        {DIRECTIONS.map(({ arrow, label, colour, place }) => (
          <div
            key={label}
            className={`absolute flex flex-col items-center gap-1 ${place}`}
            style={{ color: colour }}
          >
            <span className="font-sign text-3xl leading-none">{arrow}</span>
            <span className="font-medium text-sm">{label}</span>
          </div>
        ))}
        <p className="absolute top-1/2 left-1/2 w-28 -translate-x-1/2 -translate-y-1/2 text-center font-display font-semibold text-fg text-lg leading-tight">
          Swipe any way
        </p>
        <p className="absolute inset-x-6 bottom-[9%] text-center text-fg-2 text-sm">
          Tap the sides of a photo for more photos. Tap anywhere to start.
        </p>
      </div>
    </div>
  );
}
