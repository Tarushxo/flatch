import {
  botTenantId,
  conversations,
  type Db,
  interests,
  listings,
  localities,
  messages,
  profiles,
  users,
} from "@repo/db";
import { compatibility } from "@repo/feed";
import {
  type Applicant,
  botAcceptDelay,
  botAccepts,
  botTenantsFor,
  cleanMessage,
  DEFAULT_PREFERENCES,
  HELLO_DELAY_MS,
  type Listing,
  listerOpener,
  listerReply,
  type Match,
  type Message,
  type PendingLike,
  REPLY_DELAY,
  type TenantPreferences,
  tenantOpener,
  tenantReply,
} from "@repo/shared";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type Actor, mayDecideInterest, mayLikeListing, mayUseChat } from "../policies";
import { Refused } from "../refused";
import { publicListings, scoredFlat, toListings } from "./feed";

/*
 * Likes, matches and chat.
 *
 * A like on a flat becomes an "interest" waiting for the flat's lister. When
 * the lister says yes, a conversation opens: both sides can chat, and the
 * tenant is shown the address. Either side can end it.
 *
 * Demo bots take part through the same tables. A bot lister's yes, and every
 * bot message, is written ahead of time with the moment it becomes visible;
 * queries only return what is visible by now. So bots need no background job.
 */

/** Anything inside a transaction, or the database itself. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Conn = Db | Tx;

const GONE = new Refused(404, "not_found", "This match is no longer open.");

const tenant = alias(users, "tenant");

/** A timestamp from the database as the app expects it. */
const iso = (value: Date | string) => new Date(value).toISOString();

// ---------------------------------------------------------------- likes

/** What is needed about a flat to act on a like. */
export type LikedListing = {
  id: string;
  listerId: string;
  isSeed: boolean;
  listerRole: "owner" | "flatmate";
  listerName: string;
  locality: string;
};

/**
 * A tenant liked a flat. For a real person's flat, the like waits for its
 * lister. For a demo flat, the bot lister's answer is decided now and, if it
 * is a yes, the match and its first message are written to appear shortly.
 * Liking the same flat twice changes nothing.
 */
export async function likeListing(
  tx: Conn,
  actor: Actor,
  listing: LikedListing,
  now: Date,
): Promise<void> {
  if (mayLikeListing(actor, listing)) return;

  const botSaysYes = listing.isSeed && botAccepts(listing.id);
  const answeredAt = new Date(now.getTime() + botAcceptDelay(listing.id));

  const [interest] = await tx
    .insert(interests)
    .values({
      tenantId: actor.userId,
      listingId: listing.id,
      status: botSaysYes ? "accepted" : "pending",
      visibleAt: now,
      decidedAt: botSaysYes ? answeredAt : null,
    })
    .onConflictDoNothing()
    .returning({ id: interests.id });
  if (!interest || !botSaysYes) return;

  const [chat] = await tx
    .insert(conversations)
    .values({
      interestId: interest.id,
      tenantId: actor.userId,
      listerId: listing.listerId,
      listingId: listing.id,
      matchedAt: answeredAt,
    })
    .returning({ id: conversations.id });
  if (!chat) return;

  await tx.insert(messages).values({
    conversationId: chat.id,
    senderId: listing.listerId,
    body: listerOpener({
      locality: listing.locality,
      lister: { name: listing.listerName, role: listing.listerRole, about: "", flatmateCount: 0 },
    }),
    visibleAt: new Date(answeredAt.getTime() + HELLO_DELAY_MS),
  });
}

/**
 * A like is taken back (the tenant passed, or undid the swipe). It simply
 * disappears if the lister has not answered yet. Once there is a match, taking
 * the swipe back does not undo it; unmatching does.
 */
export async function withdrawLike(tx: Conn, userId: string, listingId: string): Promise<void> {
  await tx.execute(sql`
    delete from ${interests}
    where ${interests.tenantId} = ${userId}
      and ${interests.listingId} = ${listingId}
      and (
        ${interests.status} = 'pending'
        or (
          ${interests.status} = 'accepted'
          and exists (
            select 1 from ${conversations}
            where ${conversations.interestId} = ${interests.id}
              and ${conversations.matchedAt} > now()
          )
        )
      )
  `);
}

/** Likes still waiting for the lister, most recent first. */
export async function getPendingLikes(db: Db, userId: string): Promise<PendingLike[]> {
  const waiting = await db
    .select({ listingId: interests.listingId, likedAt: interests.createdAt })
    .from(interests)
    .leftJoin(conversations, eq(conversations.interestId, interests.id))
    .where(
      and(
        eq(interests.tenantId, userId),
        or(
          eq(interests.status, "pending"),
          // A bot's yes that has not "arrived" yet still looks like waiting.
          and(eq(interests.status, "accepted"), gt(conversations.matchedAt, sql`now()`)),
        ),
      ),
    )
    .orderBy(desc(interests.createdAt));
  if (waiting.length === 0) return [];

  const flats = await listingsById(
    db,
    waiting.map((like) => like.listingId),
  );
  return waiting.flatMap((like) => {
    const listing = flats.get(like.listingId);
    return listing ? [{ listing, likedAt: iso(like.likedAt) }] : [];
  });
}

async function listingsById(db: Db, ids: string[]): Promise<Map<string, Listing>> {
  if (ids.length === 0) return new Map();
  const rows = await publicListings(db).where(inArray(listings.id, [...new Set(ids)]));
  return new Map(toListings(rows).map((listing) => [listing.id, listing]));
}

// ---------------------------------------------------------------- the lister's side

/** Bot tenants like a newly posted flat, a few seconds apart. Skipped if the bots are not seeded. */
export async function inviteBotTenants(tx: Conn, listingId: string, now: Date): Promise<void> {
  const invited = botTenantsFor(listingId).map((each) => ({
    ...each,
    id: botTenantId(each.index),
  }));
  const present = await tx
    .select({ id: users.id })
    .from(users)
    .where(
      inArray(
        users.id,
        invited.map((each) => each.id),
      ),
    );
  const known = new Set(present.map((row) => row.id));
  const arrivals = invited.filter((each) => known.has(each.id));
  if (arrivals.length === 0) return;

  await tx
    .insert(interests)
    .values(
      arrivals.map(({ bot, id, waitMs }) => ({
        tenantId: id,
        listingId,
        status: "pending" as const,
        note: bot.note ?? "",
        compatSnapshot: bot.compatibility,
        visibleAt: new Date(now.getTime() + waitMs),
      })),
    )
    .onConflictDoNothing();
}

/** A flat's sign went off: bot tenants who have not turned up yet never will. */
export async function stopBotArrivals(tx: Conn, listingId: string): Promise<void> {
  await tx
    .delete(interests)
    .where(
      and(
        eq(interests.listingId, listingId),
        eq(interests.status, "pending"),
        gt(interests.visibleAt, sql`now()`),
      ),
    );
}

const APPLICANT_COLUMNS = {
  id: interests.id,
  listingId: interests.listingId,
  note: interests.note,
  compat: interests.compatSnapshot,
  likedAt: interests.visibleAt,
  name: tenant.name,
  about: tenant.about,
  isSeed: tenant.isSeed,
  ageRange: profiles.ageRange,
  occupation: profiles.occupation,
  preferences: profiles.preferences,
  // What the ranking engine needs about the flat, to say how well this tenant fits it.
  rent: listings.rent,
  maintenance: listings.maintenance,
  utilitiesEst: listings.utilitiesEst,
  locality: localities.name,
  availableFrom: listings.availableFrom,
  availableInDays: listings.availableInDays,
  houseRules: listings.houseRules,
  description: listings.description,
  isVerified: listings.isVerified,
  publishedAt: listings.publishedAt,
  photoCount: sql<number>`(
    select count(*)::int from listing_photos p where p.listing_id = ${sql.raw('"listings"."id"')}
  )`,
};

type ApplicantRow = {
  id: string;
  listingId: string;
  note: string;
  compat: Applicant["compatibility"] | null;
  likedAt: Date | string;
  name: string;
  about: string;
  isSeed: boolean;
  ageRange: Applicant["ageRange"] | null;
  occupation: Applicant["occupation"] | null;
  preferences: Partial<TenantPreferences> | null;
} & Parameters<typeof scoredFlat>[0];

/** A tenant as their would-be lister sees them. Never includes how to reach them. */
function toApplicant(row: ApplicantRow): Applicant {
  const today = new Date();
  return {
    id: row.id,
    listingId: row.listingId,
    name: row.name.trim() || "Someone",
    ageRange: row.ageRange ?? null,
    occupation: row.occupation ?? null,
    about: row.about,
    isSeed: row.isSeed,
    lifestyle: row.preferences?.lifestyle ?? DEFAULT_PREFERENCES.lifestyle,
    // A bot tenant's score is hand-written. A real tenant's is worked out, from what they
    // said they want and this flat, and put in the lister's words.
    compatibility:
      row.compat ??
      (row.preferences
        ? compatibility(
            { ...DEFAULT_PREFERENCES, ...row.preferences },
            scoredFlat(row, today),
            today,
            "lister",
          )
        : { percent: 0, reasons: [] }),
    ...(row.note ? { note: row.note } : {}),
    likedAt: iso(row.likedAt),
  };
}

/** Tenants waiting for this lister's answer, oldest first. */
export async function getApplicants(
  db: Db,
  userId: string,
  listingId?: string,
): Promise<Applicant[]> {
  const rows = await db
    .select(APPLICANT_COLUMNS)
    .from(interests)
    .innerJoin(listings, eq(listings.id, interests.listingId))
    .innerJoin(localities, eq(localities.id, listings.localityId))
    .innerJoin(tenant, eq(tenant.id, interests.tenantId))
    .leftJoin(profiles, eq(profiles.userId, interests.tenantId))
    .where(
      and(
        eq(listings.listerId, userId),
        eq(interests.status, "pending"),
        lte(interests.visibleAt, sql`now()`),
        listingId ? eq(interests.listingId, listingId) : undefined,
      ),
    )
    .orderBy(asc(interests.visibleAt));
  return rows.map(toApplicant);
}

/** Say yes or no to a tenant. A yes opens the chat and returns its id. */
export async function decideApplicant(
  db: Db,
  actor: Actor,
  interestId: string,
  decision: "accept" | "decline",
): Promise<{ matchId: string | null }> {
  const [found] = await db
    .select({
      id: interests.id,
      status: interests.status,
      visibleAt: interests.visibleAt,
      tenantId: interests.tenantId,
      listingId: interests.listingId,
      listerId: listings.listerId,
      title: listings.title,
      tenantName: tenant.name,
      tenantIsSeed: tenant.isSeed,
    })
    .from(interests)
    .innerJoin(listings, eq(listings.id, interests.listingId))
    .innerJoin(tenant, eq(tenant.id, interests.tenantId))
    .where(eq(interests.id, interestId));

  const now = new Date();
  // Someone else's applicant is reported as missing, like one who has gone.
  if (!found || mayDecideInterest(actor, found) || new Date(found.visibleAt) > now) {
    throw new Refused(404, "not_found", "That tenant is no longer waiting.");
  }
  if (found.status !== "pending") {
    throw new Refused(409, "already_decided", "You have already answered this tenant.");
  }

  return db.transaction(async (tx) => {
    await tx
      .update(interests)
      .set({ status: decision === "accept" ? "accepted" : "declined", decidedAt: now })
      .where(eq(interests.id, interestId));
    if (decision === "decline") return { matchId: null };

    const [chat] = await tx
      .insert(conversations)
      .values({
        interestId,
        tenantId: found.tenantId,
        listerId: found.listerId,
        listingId: found.listingId,
        matchedAt: now,
      })
      .returning({ id: conversations.id });
    if (!chat) throw new Error("The match could not be opened.");

    // A bot tenant says hello a moment later. A real one writes when they like.
    if (found.tenantIsSeed) {
      await tx.insert(messages).values({
        conversationId: chat.id,
        senderId: found.tenantId,
        body: tenantOpener(found.tenantName, found.title),
        visibleAt: new Date(now.getTime() + HELLO_DELAY_MS),
      });
    }
    return { matchId: chat.id };
  });
}

// ---------------------------------------------------------------- matches

/*
 * The chat's own columns, written out with the table's name. In a query on one
 * table the query builder leaves the table name off a column, and inside an
 * inner query a bare name such as "id" then means the inner table's column,
 * not the chat's. Naming the table removes the doubt.
 */
const THIS_CHAT = {
  id: sql.raw('"conversations"."id"'),
  tenantId: sql.raw('"conversations"."tenant_id"'),
  listerId: sql.raw('"conversations"."lister_id"'),
  tenantLastReadAt: sql.raw('"conversations"."tenant_last_read_at"'),
  listerLastReadAt: sql.raw('"conversations"."lister_last_read_at"'),
};

type LastMessage = { id: string; senderId: string; body: string; sentAt: string };

/**
 * Every match this person is part of, on either side, most recent activity
 * first. The address is included here and nowhere else: this is the only
 * place a tenant is ever given it, and only for flats they have matched with.
 */
export async function getMatches(db: Db, userId: string): Promise<Match[]> {
  const rows = await db
    .select({
      // The tenant's details first; the match's own id and flat then take their places.
      ...APPLICANT_COLUMNS,
      id: conversations.id,
      interestId: interests.id,
      tenantId: conversations.tenantId,
      listingId: conversations.listingId,
      matchedAt: conversations.matchedAt,
      society: listings.societyName,
      addressLine: listings.addressText,
      lastMessage: sql<LastMessage | null>`(
        select json_build_object('id', m.id, 'senderId', m.sender_id, 'body', m.body, 'sentAt', m.visible_at)
        from messages m
        where m.conversation_id = ${THIS_CHAT.id} and m.visible_at <= now()
        order by m.visible_at desc
        limit 1
      )`,
      // Messages from the other person that arrived after this person last looked.
      unread: sql<number>`(
        select count(*)::int from messages m
        where m.conversation_id = ${THIS_CHAT.id}
          and m.sender_id <> ${userId}
          and m.visible_at <= now()
          and m.visible_at > coalesce(
            case when ${THIS_CHAT.tenantId} = ${userId}
              then ${THIS_CHAT.tenantLastReadAt}
              else ${THIS_CHAT.listerLastReadAt}
            end,
            'epoch'::timestamptz
          )
      )`,
    })
    .from(conversations)
    .innerJoin(interests, eq(interests.id, conversations.interestId))
    .innerJoin(listings, eq(listings.id, conversations.listingId))
    .innerJoin(localities, eq(localities.id, listings.localityId))
    .innerJoin(tenant, eq(tenant.id, conversations.tenantId))
    .leftJoin(profiles, eq(profiles.userId, conversations.tenantId))
    .where(
      and(
        or(eq(conversations.tenantId, userId), eq(conversations.listerId, userId)),
        isNull(conversations.endedAt),
        lte(conversations.matchedAt, sql`now()`),
      ),
    );
  if (rows.length === 0) return [];

  const flats = await listingsById(
    db,
    rows.map((row) => row.listingId),
  );

  const matches = rows.flatMap((row): Match[] => {
    const listing = flats.get(row.listingId);
    if (!listing) return [];
    const asTenant = row.tenantId === userId;
    const applicant = toApplicant({ ...row, id: row.interestId });
    const last = row.lastMessage;
    return [
      {
        id: row.id,
        side: asTenant ? "tenant" : "lister",
        person: asTenant
          ? { name: listing.lister.name, about: listing.lister.about }
          : { name: applicant.name, about: applicant.about },
        applicant: asTenant ? null : applicant,
        listing,
        address: { society: row.society, line: row.addressLine },
        matchedAt: iso(row.matchedAt),
        lastMessage: last
          ? {
              id: last.id,
              matchId: row.id,
              from: last.senderId === userId ? "me" : "them",
              body: last.body,
              sentAt: iso(last.sentAt),
            }
          : null,
        unreadCount: row.unread,
      },
    ];
  });

  const lastActivity = (match: Match) => Date.parse(match.lastMessage?.sentAt ?? match.matchedAt);
  return matches.sort((a, b) => lastActivity(b) - lastActivity(a));
}

// ---------------------------------------------------------------- chat

/** The chat, if this person may use it right now. Anything else is "not found". */
async function openChat(db: Db, actor: Actor, matchId: string) {
  const [chat] = await db
    .select({
      id: conversations.id,
      tenantId: conversations.tenantId,
      listerId: conversations.listerId,
      endedAt: conversations.endedAt,
      matchedAt: conversations.matchedAt,
    })
    .from(conversations)
    .where(eq(conversations.id, matchId));
  if (!chat || mayUseChat(actor, chat) || new Date(chat.matchedAt) > new Date()) throw GONE;
  return chat;
}

type StoredMessage = { id: string; senderId: string; body: string; sentAt: string };

/** The messages in one match that have arrived by now, oldest first. */
export async function getMessages(db: Db, actor: Actor, matchId: string): Promise<Message[]> {
  // The chat and its messages come back together: this is asked for every few seconds
  // while a chat is open, so it is kept to one trip to the database.
  const [chat] = await db
    .select({
      tenantId: conversations.tenantId,
      listerId: conversations.listerId,
      endedAt: conversations.endedAt,
      matchedAt: conversations.matchedAt,
      items: sql<StoredMessage[]>`coalesce((
        select json_agg(
          json_build_object('id', m.id, 'senderId', m.sender_id, 'body', m.body, 'sentAt', m.visible_at)
          order by m.visible_at
        )
        from messages m
        where m.conversation_id = ${matchId} and m.visible_at <= now()
      ), '[]'::json)`,
    })
    .from(conversations)
    .where(eq(conversations.id, matchId));
  if (!chat || mayUseChat(actor, chat) || new Date(chat.matchedAt) > new Date()) throw GONE;

  return chat.items.map((row) => ({
    id: row.id,
    matchId,
    from: row.senderId === actor.userId ? "me" : "them",
    body: row.body,
    sentAt: iso(row.sentAt),
  }));
}

/** Send a message. If the other person is a demo bot, their reply is written to arrive shortly. */
export async function sendMessage(
  db: Db,
  actor: Actor,
  matchId: string,
  text: string,
): Promise<Message> {
  const body = cleanMessage(text);
  if (!body) throw new Refused(400, "empty_message", "A message needs some text.");

  // One look-up for everything needed: who is in the chat, whether the other person is a
  // bot, and how many messages this person has sent so far (a bot's reply depends on it).
  const [chat] = await db
    .select({
      tenantId: conversations.tenantId,
      listerId: conversations.listerId,
      endedAt: conversations.endedAt,
      matchedAt: conversations.matchedAt,
      otherIsSeed: sql<boolean>`(
        select u.is_seed from users u
        where u.id = case when ${THIS_CHAT.tenantId} = ${actor.userId}
          then ${THIS_CHAT.listerId} else ${THIS_CHAT.tenantId} end
      )`,
      sentSoFar: sql<number>`(
        select count(*)::int from messages m
        where m.conversation_id = ${matchId} and m.sender_id = ${actor.userId}
      )`,
    })
    .from(conversations)
    .where(eq(conversations.id, matchId));
  if (!chat || mayUseChat(actor, chat) || new Date(chat.matchedAt) > new Date()) throw GONE;

  const asTenant = chat.tenantId === actor.userId;
  const now = new Date();
  const id = crypto.randomUUID();
  const mine = { id, conversationId: matchId, senderId: actor.userId, body, visibleAt: now };
  const turn = chat.sentSoFar + 1;
  const wait = REPLY_DELAY.min + Math.random() * (REPLY_DELAY.max - REPLY_DELAY.min);
  const reply = {
    id: crypto.randomUUID(),
    conversationId: matchId,
    senderId: asTenant ? chat.listerId : chat.tenantId,
    body: asTenant ? listerReply(turn) : tenantReply(turn),
    visibleAt: new Date(now.getTime() + wait),
  };

  // The message and a bot's answer to it are stored together, or not at all.
  await db.insert(messages).values(chat.otherIsSeed ? [mine, reply] : [mine]);
  return { id, matchId, from: "me", body, sentAt: now.toISOString() };
}

/** Record that this person has seen everything in the match so far. */
export async function markRead(db: Db, actor: Actor, matchId: string): Promise<void> {
  const chat = await openChat(db, actor, matchId);
  const now = new Date();
  await db
    .update(conversations)
    .set(chat.tenantId === actor.userId ? { tenantLastReadAt: now } : { listerLastReadAt: now })
    .where(eq(conversations.id, matchId));
}

/** End a match. The chat and the address are closed to both people from then on. */
export async function unmatch(db: Db, actor: Actor, matchId: string): Promise<void> {
  await openChat(db, actor, matchId);
  await db.update(conversations).set({ endedAt: new Date() }).where(eq(conversations.id, matchId));
}
