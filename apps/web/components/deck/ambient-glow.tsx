"use client";

import { useEffect, useState } from "react";

/**
 * The light the current photo throws on the room: a large blurred pool of the
 * photo's main colour behind the deck. When the colour changes, the new pool
 * fades in over the old one (opacity only, so it is cheap to animate). The
 * pool is a radial gradient, which a phone draws far more cheaply than a blur.
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
      // Keep the previous pool underneath while the new one fades in.
      return [...current.slice(-1), { id: (last?.id ?? 0) + 1, colour }];
    });
  }, [colour]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="absolute top-1/2 left-1/2 size-[190%] -translate-x-1/2 -translate-y-1/2 animate-glow-in"
          style={{ background: `radial-gradient(closest-side, ${layer.colour}, transparent)` }}
        />
      ))}
    </div>
  );
}
