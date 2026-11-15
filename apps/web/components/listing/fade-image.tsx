"use client";

import { useEffect, useRef, useState } from "react";
import { type PhotoUse, photoSrc, photoSrcSet } from "@/lib/photo";

/**
 * A photo that fades in once it has loaded, instead of popping in. Until then
 * the parent's background shows through, which is set to the photo's main
 * colour, so the space already has roughly the right tone.
 *
 * It asks for the photo at a few widths and lets the browser pick, so a phone
 * does not download a desktop-sized image.
 *
 * Fills its parent: give the parent a size and `relative overflow-hidden`.
 */
export function FadeImage({
  src,
  alt,
  use,
  sizes,
  priority = false,
  lazy = false,
}: {
  src: string;
  alt: string;
  /** Which set of widths to offer. */
  use: PhotoUse;
  /** How wide the photo is drawn (a `sizes` value from PHOTO_SIZES). */
  sizes: string;
  /** The first thing the person looks at: fetch it before everything else. */
  priority?: boolean;
  /** Off-screen for now: wait until it is about to be seen. */
  lazy?: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish loading before React attaches onLoad.
  useEffect(() => {
    if (image.current?.complete) setLoaded(true);
  }, []);

  return (
    <img
      ref={image}
      src={photoSrc(src, use)}
      srcSet={photoSrcSet(src, use)}
      sizes={sizes}
      alt={alt}
      draggable={false}
      decoding="async"
      loading={lazy ? "lazy" : "eager"}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={() => setLoaded(true)}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
