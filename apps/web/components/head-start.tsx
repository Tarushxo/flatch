"use client";

import { useSyncExternalStore } from "react";

const never = () => () => {};

/**
 * Writes the head-start script (lib/start) into the page the server sends, and
 * nowhere else. A script only runs when it arrives as part of the page; one
 * that React adds later, when someone moves here from another screen, never
 * runs and only earns a warning. So it is rendered on the server and while the
 * page is first being picked up, then dropped.
 */
export function HeadStart({ script }: { script: string }) {
  const inThePageItself = useSyncExternalStore(
    never,
    () => false,
    () => true,
  );
  if (!inThePageItself) return null;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: our own fixed script, no user input
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
