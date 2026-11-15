"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A photo that fades in once it has loaded, instead of popping in. Until then
 * the parent's background shows through, which is set to the photo's main
 * colour, so the space already has roughly the right tone.
 *
 * Fills its parent: give the parent a size and `relative overflow-hidden`.
 */
export function FadeImage({ src, alt }: { src: string; alt: string }) {
  const image = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish loading before React attaches onLoad.
  useEffect(() => {
    if (image.current?.complete) setLoaded(true);
  }, []);

  return (
    <img
      ref={image}
      src={src}
      alt={alt}
      draggable={false}
      onLoad={() => setLoaded(true)}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
