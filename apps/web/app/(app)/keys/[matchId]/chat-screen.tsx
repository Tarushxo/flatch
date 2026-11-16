"use client";

import {
  type Applicant,
  cleanMessage,
  formatRent,
  type Match,
  MESSAGE_MAX_LENGTH,
  type Message,
  mapsLink,
  tenantLine,
} from "@repo/shared";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ScreenMessage } from "@/components/app-shell/screen-message";
import { ArrowLeftIcon, DirectionsIcon, MoreIcon, SendIcon } from "@/components/icons";
import { ListingThumb } from "@/components/match/listing-thumb";
import { MarqueeBulbs } from "@/components/motifs/marquee-bulbs";
import { KeyDrawing } from "@/components/motifs/neon-drawing";
import { SignLink } from "@/components/sign-link";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import {
  MATCHES_KEY,
  useAllMatches,
  useMarkRead,
  useMessages,
  useSendMessage,
} from "@/lib/matches/use-matches";
import { initial } from "@/lib/names";
import { clockTime } from "@/lib/time";

const QUICK_REPLIES = {
  tenant: ["When can I visit?", "Is it still available?", "What are the flatmates like?"],
  lister: [
    "When would you like to visit?",
    "Tell me a bit about yourself",
    "When can you move in?",
  ],
} as const;

/** How long to show a demo account "typing" after a message is sent, if no reply has arrived. */
const TYPING_FOR_MS = 7000;

/**
 * The chat for one match. A tenant sees the unlocked address at the top; a
 * lister sees a reminder of who they gave the key to.
 */
export function ChatScreen({ matchId }: { matchId: string }) {
  // Every match, whichever side of the app is in use: the match moment can lead here for a
  // tenant-side match while the person is looking at their lister side.
  const matches = useAllMatches();
  const messages = useMessages(matchId);
  const send = useSendMessage(matchId);
  const { mutate: markRead } = useMarkRead(matchId);

  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const match = matches.data?.find((item) => item.id === matchId);
  const otherIsDemo = match
    ? match.side === "tenant"
      ? match.listing.isSeed
      : Boolean(match.applicant?.isSeed)
    : false;
  const thread = messages.data ?? [];
  const count = thread.length;
  const lastFrom = thread[count - 1]?.from;

  // Keep the newest message in view, and mark what has been seen as read.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when a message arrives
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
    if (lastFrom === "them") {
      setTyping(false);
      markRead();
    }
  }, [count, lastFrom]);

  // "Typing" gives up after a while if nothing comes back.
  useEffect(() => {
    if (!typing) return;
    const timer = setTimeout(() => setTyping(false), TYPING_FOR_MS);
    return () => clearTimeout(timer);
  }, [typing]);

  function submit(text: string) {
    const body = cleanMessage(text);
    if (!body) return;
    setDraft("");
    // Only a demo account is known to be about to answer. Telling someone that a real
    // person "is typing" when nobody knows that would be a small lie.
    setTyping(otherIsDemo);
    send.mutate(body, {
      onError: (error) => {
        setTyping(false);
        setDraft(body);
        // A limit (a very long chat, or a great many messages in a day) explains itself.
        toast.error(
          error instanceof ApiError && (error.status === 429 || error.code === "chat_full")
            ? error.message
            : "That message didn't send. It is back in the box to try again.",
        );
      },
    });
  }

  if (matches.isPending || messages.isPending) {
    return (
      <div role="status" className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-4">
          <MarqueeBulbs total={8} chase />
          <p className="text-fg-2 text-sm">Opening the chat…</p>
        </div>
      </div>
    );
  }

  // The chat is gone only if the server says so, or nothing could be loaded at all. One
  // failed request on a weak connection must not swap an open chat for an error screen.
  const gone = messages.error instanceof ApiError && messages.error.status === 404;
  if (!match || gone || (messages.isError && !messages.data)) {
    return (
      <ScreenMessage
        art={<KeyDrawing className="[--glow:var(--pass)]" />}
        title="This key isn't on the rack"
        body="The match may have ended, or the flat may have been taken down."
      >
        <SignLink href="/keys" size="sm">
          Back to your keys
        </SignLink>
      </ScreenMessage>
    );
  }

  const name = match.person.name;
  const haveWritten = thread.some((message) => message.from === "me");

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <ChatHeader match={match} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {match.applicant ? (
          <TenantCard match={match} applicant={match.applicant} />
        ) : (
          <AddressCard match={match} />
        )}

        <ol className="mt-6 space-y-2" aria-label={`Messages with ${name}`}>
          {thread.map((message) => (
            <Bubble key={message.id} message={message} name={name} />
          ))}
        </ol>

        {typing ? (
          <p className="mt-3 text-fg-3 text-sm" aria-live="polite">
            {name} is typing…
          </p>
        ) : null}

        {haveWritten ? null : (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Quick replies">
            {QUICK_REPLIES[match.side].map((reply) => (
              <li key={reply}>
                <button
                  type="button"
                  onClick={() => submit(reply)}
                  className="rounded-full border border-brand-b/45 px-3.5 py-2 text-brand-b text-sm transition-colors hover:bg-brand-b/10"
                >
                  {reply}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div ref={end} className="h-2" />
      </div>

      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submit(draft);
        }}
        className="flex shrink-0 items-center gap-2 border-hairline border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <label htmlFor="chat-message" className="sr-only">
          Message {name}
        </label>
        <input
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          autoComplete="off"
          placeholder={`Message ${name}`}
          className="min-w-0 flex-1 rounded-full border border-hairline bg-surface-2 px-4 py-3 text-fg placeholder:text-fg-3"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={cleanMessage(draft) === null}
          className="bubble-mine grid size-12 shrink-0 place-items-center rounded-full transition-opacity disabled:opacity-35"
        >
          <SendIcon className="size-5" />
        </button>
      </form>
    </div>
  );
}

function ChatHeader({ match }: { match: Match }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const { listing } = match;
  const name = match.person.name;

  async function unmatch() {
    try {
      await api.unmatch(match.id);
      await queryClient.invalidateQueries({ queryKey: MATCHES_KEY });
      toast(`Unmatched from ${name}`);
      router.push("/keys");
    } catch {
      toast.error("Couldn't unmatch just now. Try again in a moment.");
    }
  }

  return (
    <header className="flex shrink-0 items-center gap-3 border-hairline border-b px-3 py-3">
      <Link
        href="/keys"
        aria-label="Back to your keys"
        className="grid size-10 shrink-0 place-items-center rounded-full text-fg-2 transition-colors hover:bg-fg/10 hover:text-fg"
      >
        <ArrowLeftIcon className="size-5" />
      </Link>
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-a to-brand-b font-display font-semibold text-white"
      >
        {initial(name)}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-medium">{name}</h1>
        <p className="truncate text-fg-3 text-xs">{listing.title}</p>
      </div>

      <details className="relative" onToggle={() => setConfirming(false)}>
        <summary
          aria-label="More options"
          className="grid size-10 cursor-pointer list-none place-items-center rounded-full text-fg-2 transition-colors hover:bg-fg/10 hover:text-fg [&::-webkit-details-marker]:hidden"
        >
          <MoreIcon className="size-6" />
        </summary>
        <div className="surface absolute top-12 right-0 z-10 w-56 rounded-2xl p-2 shadow-[0_16px_40px_-8px_rgb(0_0_0/0.7)]">
          <button
            type="button"
            onClick={() => (confirming ? void unmatch() : setConfirming(true))}
            className="w-full rounded-xl px-3 py-2.5 text-left text-pass text-sm transition-colors hover:bg-pass/10"
          >
            {confirming ? "Tap again to unmatch" : "Unmatch"}
          </button>
          <p className="px-3 pt-1 pb-2 text-fg-3 text-xs">
            Ends the chat for both of you. This cannot be undone.
          </p>
        </div>
      </details>
    </header>
  );
}

/** The key itself: the address that was hidden until the match, and the house rule about money. */
function AddressCard({ match }: { match: Match }) {
  const { listing, address } = match;
  return (
    <section aria-label="The flat" className="surface rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <ListingThumb listing={listing} />
        <div className="min-w-0">
          <p className="font-medium text-win text-xs uppercase tracking-[0.18em]">Your key</p>
          <p className="mt-0.5 line-clamp-1 font-medium">{listing.title}</p>
          <p className="font-mono text-fg-2 text-sm tabular-nums">{formatRent(listing.rent)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-hairline border-t pt-4">
        <address className="text-sm not-italic leading-relaxed">
          <span className="block font-medium">{address.society}</span>
          <span className="block text-fg-2">
            {address.line}, {listing.locality}
          </span>
        </address>
        <a
          href={mapsLink(address, listing.locality)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-like/40 px-3.5 py-2 font-medium text-like text-sm transition-colors hover:bg-like/10"
        >
          <DirectionsIcon className="size-4" />
          Open in Maps
        </a>
      </div>

      <p className="mt-4 rounded-xl border border-save/30 bg-save/10 px-3 py-2.5 text-save text-xs leading-relaxed">
        <span className="font-sign tracking-[0.16em]">MANAGEMENT NOTICE</span>
        <span className="mt-1 block text-fg-2">
          Never pay a deposit, token or fee before you have visited the flat in person.
        </span>
      </p>
    </section>
  );
}

/** The lister's view of the same card: who has the key, and what they were told. */
function TenantCard({ match, applicant }: { match: Match; applicant: Applicant }) {
  const { listing, address } = match;
  return (
    <section aria-label="The tenant" className="surface rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <ListingThumb listing={listing} />
        <div className="min-w-0">
          <p className="font-medium text-win text-xs uppercase tracking-[0.18em]">
            {applicant.name} has a key to
          </p>
          <p className="mt-0.5 line-clamp-1 font-medium">{listing.title}</p>
          <p className="text-fg-2 text-sm">
            {tenantLine(applicant)}
            {applicant.compatibility.percent > 0 ? (
              <>
                {" · "}
                <span className="font-mono tabular-nums">{applicant.compatibility.percent}%</span>{" "}
                match
              </>
            ) : null}
          </p>
        </div>
      </div>

      <p className="mt-4 border-hairline border-t pt-4 text-fg-2 text-sm leading-relaxed">
        {applicant.about}
      </p>

      <p className="mt-4 rounded-xl border border-hairline px-3 py-2.5 text-fg-3 text-xs leading-relaxed">
        They can now see the address: {address.society}, {address.line}, {listing.locality}.
      </p>
    </section>
  );
}

function Bubble({ message, name }: { message: Message; name: string }) {
  const mine = message.from === "me";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-3xl px-4 py-2.5 ${
          mine ? "bubble-mine rounded-br-lg" : "surface rounded-bl-lg"
        }`}
      >
        <span className="sr-only">{mine ? "You said: " : `${name} said: `}</span>
        <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed">
          {message.body}
        </p>
        <p className={`mt-1 text-right text-[0.6875rem] ${mine ? "text-fg/65" : "text-fg-3"}`}>
          {clockTime(message.sentAt)}
        </p>
      </div>
    </li>
  );
}
