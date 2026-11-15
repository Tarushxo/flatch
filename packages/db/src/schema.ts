import type { Compatibility, HouseRule } from "@repo/shared";
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
 * The database tables, as of M2: enough for a real feed and persisted swipes.
 * Later milestones add accounts (M3), interests and chat (M4) and impressions
 * (M5). The full plan is in docs/SPEC.md section 6.
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
 * A person. Until sign-in arrives (M3) the only real users are visitors,
 * known by a random id kept in a cookie; seed users are the bot listers.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull().default(""),
  about: text("about").notNull().default(""),
  isSeed: boolean("is_seed").notNull().default(false),
  isGuest: boolean("is_guest").notNull().default(true),
  createdAt,
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

export type ListingRow = typeof listings.$inferSelect;
export type ListingPhotoRow = typeof listingPhotos.$inferSelect;
