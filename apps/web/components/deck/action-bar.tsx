import type { CSSProperties, ReactNode } from "react";
import { BookmarkIcon, CrossIcon, HeartIcon, UndoIcon } from "@/components/icons";
import type { DeckAction } from "@/lib/deck/gesture";

/**
 * The buttons under the deck. Every swipe has a button here, so swiping is
 * never the only way to act. The keyboard shortcuts are handled by the deck.
 */
export function ActionBar({
  disabled,
  canUndo,
  onAction,
  onUndo,
}: {
  disabled: boolean;
  canUndo: boolean;
  onAction: (action: DeckAction) => void;
  onUndo: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <RoundButton
        label="Pass"
        shortcut="Left arrow"
        colour="var(--pass)"
        size="lg"
        disabled={disabled}
        onClick={() => onAction("pass")}
      >
        <CrossIcon className="size-7" />
      </RoundButton>
      <RoundButton
        label="Undo last swipe"
        shortcut="Z"
        colour="var(--text-2)"
        size="sm"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <UndoIcon className="size-5" />
      </RoundButton>
      <RoundButton
        label="Save for later"
        shortcut="Up arrow"
        colour="var(--save)"
        size="sm"
        disabled={disabled}
        onClick={() => onAction("save")}
      >
        <BookmarkIcon className="size-5" />
      </RoundButton>
      <RoundButton
        label="Like"
        shortcut="Right arrow"
        colour="var(--like)"
        size="lg"
        disabled={disabled}
        onClick={() => onAction("like")}
      >
        <HeartIcon className="size-7" />
      </RoundButton>
    </div>
  );
}

function RoundButton({
  label,
  shortcut,
  colour,
  size,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut: string;
  colour: string;
  size: "sm" | "lg";
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (${shortcut})`}
      disabled={disabled}
      onClick={onClick}
      className={`hover:glow focus-visible:glow grid place-items-center rounded-full border border-hairline bg-surface-1 transition-[box-shadow,transform,opacity] duration-200 hover:border-transparent active:scale-90 disabled:pointer-events-none disabled:opacity-35 ${
        size === "lg" ? "size-16" : "size-12"
      }`}
      style={{ color: colour, "--glow": colour } as CSSProperties}
    >
      {children}
    </button>
  );
}
