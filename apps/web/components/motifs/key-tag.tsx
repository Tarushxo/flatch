// A motel key fob: pointed at the top where the ring goes, chamfered at the bottom.
const TAG_SHAPE = "polygon(50% 0, 100% 19%, 100% 95%, 93% 100%, 7% 100%, 0 95%, 0 19%)";

/**
 * The room key you are handed when you match. It swings once when it appears,
 * as if it has just been put on the hook.
 *
 * Used on the match screen, as the items on the Matches "key rack", and where
 * the address is revealed.
 */
export function KeyTag({ locality, detail }: { locality: string; detail: string }) {
  return (
    <div className="relative inline-block w-36 origin-top animate-swing pt-6 [filter:drop-shadow(0_0_16px_color-mix(in_oklab,var(--win)_40%,transparent))]">
      {/* The key ring, passing behind the fob and through its hole */}
      <span
        aria-hidden="true"
        className="-translate-x-1/2 absolute top-0 left-1/2 size-12 rounded-full border-2 border-fg-3"
      />
      <div className="relative bg-win p-[1.5px]" style={{ clipPath: TAG_SHAPE }}>
        <div
          className="flex min-h-52 flex-col items-center bg-surface-2 px-3 pt-12 pb-5 text-center"
          style={{ clipPath: TAG_SHAPE }}
        >
          <span
            aria-hidden="true"
            className="-translate-x-1/2 absolute top-4 left-1/2 size-4 rounded-full bg-ink ring-1 ring-win/60"
          />
          <p className="font-sign text-[0.625rem] text-fg-2 tracking-[0.24em]">YOUR KEY</p>
          <p className="mt-2 font-display font-semibold text-win text-xl leading-tight">
            {locality}
          </p>
          <p className="mt-2 text-fg-2 text-xs">{detail}</p>
          <p
            aria-hidden="true"
            className="mt-auto pt-4 text-[0.5625rem] text-fg-3 tracking-[0.16em]"
          >
            DROP IN ANY MAILBOX
          </p>
        </div>
      </div>
    </div>
  );
}
