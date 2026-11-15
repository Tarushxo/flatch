"use client";

import { type CSSProperties, useEffect, useState } from "react";

/**
 * The light the top card throws: a halo of the photo's colour hugging the
 * deck, as if the card were a lit window. It keeps the photo's hue but is
 * drawn deep and saturated (see `deck-halo` in globals.css), because a
 * photo's true average colour is usually a dull beige that turns to haze.
 *
 * When the colour changes, the new halo fades in over the old one (opacity
 * only). Render it inside the box the cards sit in.
 */
export function AmbientGlow({ colour }: { colour: string | null }) {
  const [layers, setLayers] = useState<{ id: number; colour: string }[]>([]);

  useEffect(() => {
    // No card on top: the light goes out.
    if (!colour) {
      setLayers([]);
      return;
    }
    setLayers((current) => {
      const last = current[current.length - 1];
      if (last?.colour === colour) return current;
      // Keep the previous halo underneath while the new one fades in.
      return [...current.slice(-1), { id: (last?.id ?? 0) + 1, colour }];
    });
  }, [colour]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="deck-halo absolute inset-2 animate-glow-in"
          style={{ "--halo": layer.colour } as CSSProperties}
        />
      ))}
    </div>
  );
}
