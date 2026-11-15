import type {
  Compatibility,
  HouseRule,
  ReportReason,
  TenantPreferences,
  TenantProfile,
} from "@repo/shared";
import { CITIES, FURNISHINGS, ROOM_TAGS, ROOM_TYPES, SWIPE_ACTIONS } from "@repo/shared";
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  geometry,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * The database tables: flats and swipes (M2), accounts and profiles (M3),
 * likes, matches and chat (M4). Impressions arrive with the feed engine (M5). The full plan is in docs/SPEC.md section 6.
 *
 * Money is whole rupees. Times are UTC. Points are PostGIS geometry holding
 * longitude and latitude, read and written as { x: lng, y: lat }.
 */

export const cityEnum = pgEnum("city", CITIES);
export const roomTypeEnum = pgEnum("room_type", ROOM_TYPES);
export const furnishingEnum = pgEnum("furnishing", FURNISHINGS);
export const roomTagEnum = pgEnum("room_tag", ROOM_TAGS);
export const swipeActionEnum = pgEnum("swipe_action", SWIPE_ACTIONS);
export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "active",
  "paused",
  "filled",
  "expired",
]);
export const listerRoleEnum = pgEnum("lister_role", ["owner", "flatmate"]);

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const point = (name: string) => geometry(name, { type: "point", mode: "xy" });

/**
 * A person. The sign-in library (Better Auth) owns this table and the three
 * after it; the property names here are the ones it expects. A visitor who has
 * not signed in is a guest account (`isAnonymous`) with a made-up email.
 * Seed users are the bot listers.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("display_name").notNull().default(""),
  // The sign-in library always supplies an email. The default only exists so rows written
  // before this column was added, or by code that does not know about it, stay valid.
  email: text("email")
    .notNull()
    .unique()
    .default(sql`(gen_random_uuid()::text || '@guest.flatch.invalid')`),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  about: text("about").notNull().default(""),
  isSeed: boolean("is_seed").notNull().default(false),
  isAnonymous: boolean("is_guest").notNull().default(true),
  createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A signed-in browser. Deleted when the person signs out or the session runs out. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user").on(table.userId)],
);

/** A way of signing in that belongs to a user, such as their Google account. */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("accounts_user").on(table.userId)],
);

/** Short-lived values the sign-in library needs between steps of a sign-in. */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verifications_identifier").on(table.identifier)],
);

/**
 * What a person told the app about themselves and what they are looking for.
 * The name lives on the user. Preferences are kept whole, as the app sends
 * them; the ranking engine (M5) will pull out the columns it needs to query.
 */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  ageRange: text("age_range").$type<TenantProfile["ageRange"]>(),
  occupation: text("occupation").$type<TenantProfile["occupation"]>(),
  mode: text("mode").$type<TenantProfile["mode"]>().notNull().default("tenant"),
  preferences: jsonb("preferences").$type<TenantPreferences>().notNull(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const localities = pgTable(
  "localities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    city: cityEnum("city").notNull(),
    name: text("name").notNull(),
    centroid: point("centroid").notNull(),
  },
  (table) => [uniqueIndex("localities_city_name").on(table.city, table.name)],
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listerId: uuid("lister_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: listingStatusEnum("status").notNull().default("active"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    localityId: uuid("locality_id")
      .notNull()
      .references(() => localities.id),

    // Private: these three never leave the server before a match (SPEC 10.1).
    societyName: text("society_name").notNull(),
    addressText: text("address_text").notNull(),
    locationExact: point("location_exact").notNull(),
    /** The exact point snapped to a grid and shifted. This is the only location sent out. */
    locationPublic: point("location_public").notNull(),

    rent: integer("rent").notNull(),
    deposit: integer("deposit").notNull().default(0),
    maintenance: integer("maintenance").notNull().default(0),
    utilitiesEst: integer("utilities_est").notNull().default(0),

    roomType: roomTypeEnum("room_type").notNull(),
    bhk: integer("bhk").notNull(),
    furnishing: furnishingEnum("furnishing").notNull(),
    availableFrom: date("available_from").notNull(),
    /** Seed flats only: days from today the flat is free, so demo dates never go stale. */
    availableInDays: integer("available_in_days"),

    amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
    nearby: text("nearby").array().notNull().default(sql`'{}'::text[]`),
    houseRules: jsonb("house_rules").$type<HouseRule[]>().notNull().default([]),
    societyRules: text("society_rules").array().notNull().default(sql`'{}'::text[]`),
    expectations: text("expectations").array().notNull().default(sql`'{}'::text[]`),

    listerRole: listerRoleEnum("lister_role").notNull().default("flatmate"),
    flatmateCount: integer("flatmate_count").notNull().default(0),

    /** Orders the feed until the ranking engine (M5) scores each flat per tenant. */
    qualityScore: real("quality_score").notNull().default(0),
    // Hand-written for seed flats, and shown as they are until the ranking engine (M5)
    // works these out for each tenant: the match score, the commute and the stretch label.
    seedCompat: jsonb("seed_compat").$type<Compatibility>(),
    seedCommuteMinutes: integer("seed_commute_minutes"),
    seedStretchLabel: text("seed_stretch_label"),

    isSeed: boolean("is_seed").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    /** The key the seed script knows this flat by, so re-seeding updates rather than duplicates. */
    seedKey: text("seed_key").unique(),

    /** When the flat comes off the board unless its lister renews it. Null (demo flats): never. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Set when enough people have reported the flat. It stays off the board until cleared by hand. */
    underReview: boolean("under_review").notNull().default(false),

    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => [
    index("listings_location_exact").using("gist", table.locationExact),
    index("listings_active_rent").on(table.rent).where(sql`${table.status} = 'active'`),
    index("listings_active_available")
      .on(table.availableFrom)
      .where(sql`${table.status} = 'active'`),
    index("listings_locality").on(table.localityId),
    index("listings_feed_order").on(table.qualityScore.desc(), table.id),
  ],
);

export const listingPhotos = pgTable(
  "listing_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** Where the photo is served from. An image-host id replaces this when uploads arrive (M3). */
    url: text("url").notNull(),
    roomTag: roomTagEnum("room_tag").notNull(),
    dominantColor: text("dominant_color").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [uniqueIndex("listing_photos_order").on(table.listingId, table.position)],
);

export const swipes = pgTable(
  "swipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    action: swipeActionEnum("action").notNull(),
    /** Made up by the app for each swipe, so a request sent twice is only counted once. */
    clientId: uuid("client_id").notNull(),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One decision per person per flat: a swiped flat never comes back.
    uniqueIndex("swipes_user_listing").on(table.userId, table.listingId),
    index("swipes_user_action").on(table.userId, table.action, table.updatedAt.desc()),
  ],
);

/** One person's report about one flat. A second report from the same person replaces the first. */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    reason: text("reason").$type<ReportReason>().notNull(),
    note: text("note").notNull().default(""),
    createdAt,
  },
  (table) => [uniqueIndex("reports_reporter_listing").on(table.reporterId, table.listingId)],
);

/**
 * A tenant's like on a flat, waiting for its lister. Accepting one opens a
 * conversation. `visibleAt` is when the lister can first see it: now for a
 * real tenant, a little later for a demo bot, so bots seem to arrive one by one.
 */
export const interests = pgTable(
  "interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"pending" | "accepted" | "declined">()
      .notNull()
      .default("pending"),
    note: text("note").notNull().default(""),
    /** The match score shown to the lister. Hand-written for bots; worked out by the ranking engine from M5. */
    compatSnapshot: jsonb("compat_snapshot").$type<Compatibility>(),
    visibleAt: timestamp("visible_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("interests_tenant_listing").on(table.tenantId, table.listingId),
    index("interests_listing_status").on(table.listingId, table.status),
  ],
);

/**
 * A match: the chat between a tenant and a lister about one flat. It exists
 * from the moment of acceptance, but `matchedAt` is when both sides can see
 * it, which for a bot lister's yes is a few seconds after the like.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interestId: uuid("interest_id")
      .notNull()
      .unique()
      .references(() => interests.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listerId: uuid("lister_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    matchedAt: timestamp("matched_at", { withTimezone: true }).notNull().defaultNow(),
    tenantLastReadAt: timestamp("tenant_last_read_at", { withTimezone: true }),
    listerLastReadAt: timestamp("lister_last_read_at", { withTimezone: true }),
    /** Set when either side unmatches. The chat and the address are then closed to both. */
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("conversations_tenant").on(table.tenantId),
    index("conversations_lister").on(table.listerId),
  ],
);

/** One chat message. A bot's reply is written ahead of time and shown from `visibleAt`. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    visibleAt: timestamp("visible_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => [index("messages_conversation").on(table.conversationId, table.visibleAt)],
);

export type ListingRow = typeof listings.$inferSelect;
export type ListingPhotoRow = typeof listingPhotos.$inferSelect;
