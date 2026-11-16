"use client";

import { useEffect, useState } from "react";

/**
 * A value that only changes once it has stopped changing for a moment. Used
 * where each change would otherwise ask the server something: dragging a
 * slider across its range passes through dozens of values, and only the one
 * it comes to rest on is worth asking about.
 *
 * Values are compared by what they hold, not by identity, so an object rebuilt
 * on every draw with the same contents does not restart the wait.
 */
export function useSettled<T>(value: T, waitMs = 250): T {
  const [settled, setSettled] = useState(value);
  const key = JSON.stringify(value);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `value`
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), waitMs);
    return () => clearTimeout(timer);
  }, [key, waitMs]);

  return settled;
}
