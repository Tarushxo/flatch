import type { ReactNode } from "react";

/**
 * A full-screen message with a neon drawing: used for screens a later
 * milestone builds, and for empty states.
 */
export function ScreenMessage({
  art,
  title,
  body,
  children,
}: {
  /** A NeonDrawing, sized by this component. */
  art: ReactNode;
  title: string;
  body: string;
  /** Optional actions under the text. */
  children?: ReactNode;
}) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <div className="size-28 [&>*]:size-full">{art}</div>
        <h1 className="mt-5 font-display font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="mt-2 max-w-xs text-fg-2 text-sm leading-relaxed">{body}</p>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  );
}
