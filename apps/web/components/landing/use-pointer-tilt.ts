"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * Lets a scene lean towards the pointer. It writes two numbers, each from -1
 * to 1, onto the element as `--px` and `--py`, at most once a frame; the
 * element's own styles decide what to do with them (a tilt, or layers that
 * slide by different amounts). Nothing here causes a redraw of the page.
 *
 * It does nothing on touch screens, where there is no pointer to follow, or
 * for people who have asked for less motion.
 */
export function usePointerTilt<T extends HTMLElement>(): RefObject<T | null> {
  const scene = useRef<T>(null);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (calm || !hover) return;

    let frame = 0;
    let next = { x: 0, y: 0 };
    const write = () => {
      frame = 0;
      element.style.setProperty("--px", next.x.toFixed(3));
      element.style.setProperty("--py", next.y.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      next = {
        x: Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1)),
        y: Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1)),
      };
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onLeave = () => {
      next = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(write);
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);
    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return scene;
}
