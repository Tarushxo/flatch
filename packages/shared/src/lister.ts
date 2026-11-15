import type { z } from "zod";
import { DEFAULT_CITY } from "./constants";
import type { Listing } from "./listing";
import type {
  ApplicantSchema,
  DevicePositionSchema,
  ListingDraftSchema,
  MyListingSchema,
  UploadTicketSchema,
} from "./schemas";
import { OCCUPATION_LABELS } from "./tenant";

/*
 * The lister's side: the flat they post, and the tenants who like it. The
 * fixed lists of choices live here with their wording, so the posting form and
 * the listing page read from one place.
 */

export const AMENITIES = [
  "Wifi",
  "Air conditioned",
  "Lift",
  "Power backup",
  "Washing machine",
  "Parking",
  "Balcony",
  "Water purifier",
  "Cook",
  "Housekeeping",
  "Gym",
  "Pool",
  "Terrace",
  "Garden",
] as const;

/** Things a household either allows or does not. The lister answers each one, or leaves it out. */
export const HOUSE_RULE_OPTIONS = [
  "Overnight guests",
  "Alcohol",
  "Smoking indoors",
  "Pets",
  "Non-veg cooking",
  "Parties",
] as const;

export const SOCIETY_RULE_OPTIONS = [
  "Bachelors allowed",
  "Visitors until 10:30 pm",
  "Main gate closes at 11 pm",
  "24-hour security",
  "Pets allowed with registration",
  "No pets in common areas",
  "Covered parking",
  "Two-wheeler parking only",
] as const;

export const EXPECTATION_OPTIONS = [
  "Share the weekly cleaning",
  "Pay rent by the 5th",
  "Stay at least 6 months",
  "Give a month's notice",
  "Keep it quiet after 11 pm",
  "Tell us before guests stay over",
] as const;

export const LISTING_LIMITS = {
  titleMin: 8,
  titleMax: 70,
  descriptionMax: 400,
  rentMin: 3000,
  rentMax: 200_000,
  photosMin: 3,
  photosMax: 8,
  depositMonthsMax: 10,
  societyMax: 80,
  addressLineMax: 120,
  /** The most flats one person may have open to likes at once. */
  openMax: 2,
  /** How long a flat stays on the board before its lister has to say it is still available. */
  openDays: 30,
  /** From how many days before the end the lister is reminded. */
  remindDays: 7,
} as const;

/*
 * Reports. A signed-in person can report a flat someone posted. Enough
 * reports from different people take the flat off the board until it has been
 * looked at.
 */
export const REPORT_REASONS = [
  "not_theirs",
  "fake",
  "wrong_details",
  "offensive",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  not_theirs: "It is not their flat to let",
  fake: "It does not exist",
  wrong_details: "The details or photos are wrong",
  offensive: "It is offensive",
  other: "Something else",
};
export const REPORT_NOTE_MAX = 300;
/** Reports from this many different people take a flat off the board. */
export const REPORTS_TO_PAUSE = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When a flat posted (or renewed) at `from` comes off the board. */
export function expiryFrom(from: Date): Date {
  return new Date(from.getTime() + LISTING_LIMITS.openDays * DAY_MS);
}

/**
 * Whole days until a flat comes off the board, counting a part of a day as a
 * day. Zero or less means it has. Null for a flat that never expires.
 */
export function daysLeft(expiresAt: string | null, now: Date): number | null {
  if (expiresAt === null) return null;
  return Math.ceil((Date.parse(expiresAt) - now.getTime()) / DAY_MS);
}

/** Whether a flat has run out of time on the board. */
export function hasExpired(expiresAt: string | null, now: Date): boolean {
  const left = daysLeft(expiresAt, now);
  return left !== null && left <= 0;
}

/** The steps of posting a flat, in order. */
export const LISTING_STEPS = ["basics", "where", "costs", "photos", "home", "preview"] as const;
export type ListingStep = (typeof LISTING_STEPS)[number];

export type ListingDraft = z.infer<typeof ListingDraftSchema>;
export type MyListing = z.infer<typeof MyListingSchema>;
export type Applicant = z.infer<typeof ApplicantSchema>;
/**
 * The line under a tenant's name: their age range and what they do, as far as
 * they have said. A real tenant may have said neither.
 */
export function tenantLine(tenant: Pick<Applicant, "ageRange" | "occupation">): string {
  const parts = [tenant.ageRange, tenant.occupation ? OCCUPATION_LABELS[tenant.occupation] : null];
  return parts.filter(Boolean).join(" · ") || "Has not said much yet";
}

export type DevicePosition = z.infer<typeof DevicePositionSchema>;
export type UploadTicket = z.infer<typeof UploadTicketSchema>;

/** The rooms a lister can label a photo with, and how each is worded. */
export const ROOM_TAG_LABELS = {
  bedroom: "Bedroom",
  living: "Living room",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  balcony: "Balcony",
  building: "Building",
} as const;

/*
 * "Posted from here": the lister's device said it was at the flat when they
 * posted. It shows they were standing there, not that the flat is theirs.
 */
export const ON_SITE = {
  /** How far from the middle of the chosen area the device may be, in metres. Areas are big. */
  maxFromAreaMetres: 6000,
  /** The widest radius of doubt that still counts as knowing where the device is, in metres. */
  maxAccuracyMetres: 500,
} as const;

export type OnSiteResult = { ok: true } | { ok: false; reason: "imprecise" | "elsewhere" };

/** Roughly how far apart two points are, in metres. Good enough at city scale. */
export function metresApart(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const north = (a.lat - b.lat) * 111_320;
  const east = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(north, east);
}

/** Whether a device's position is good enough to say the lister is at a flat in this area. */
export function checkOnSite(
  areaCentre: { lat: number; lng: number },
  position: DevicePosition,
): OnSiteResult {
  if (position.accuracy > ON_SITE.maxAccuracyMetres) return { ok: false, reason: "imprecise" };
  if (metresApart(areaCentre, position) > ON_SITE.maxFromAreaMetres) {
    return { ok: false, reason: "elsewhere" };
  }
  return { ok: true };
}

/** What to tell the lister when the check does not pass. */
export const ON_SITE_REASONS: Record<"imprecise" | "elsewhere", string> = {
  imprecise:
    "Your device could not tell where it is closely enough. Try again outdoors or with location turned up.",
  elsewhere:
    "Your device is not in the area you chose for this flat. Try again when you are there.",
};

/** A blank form. Nothing is chosen for the person except the city. */
export const EMPTY_DRAFT: ListingDraft = {
  title: "",
  description: "",
  city: DEFAULT_CITY,
  locality: "",
  society: "",
  addressLine: "",
  roomType: "private_room",
  bhk: 2,
  furnishing: "furnished",
  availableFrom: "",
  rent: 0,
  maintenance: 0,
  utilitiesEstimate: 0,
  depositMonths: 2,
  photos: [],
  amenities: [],
  houseRules: [],
  societyRules: [],
  expectations: [],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What still needs fixing on one step of the form, as sentences to show the
 * person. An empty list means the step is done. The preview step repeats every
 * earlier check, so nothing incomplete can be published.
 */
export function draftProblems(draft: ListingDraft, step: ListingStep): string[] {
  const limits = LISTING_LIMITS;
  const whole = (value: number) => Number.isInteger(value) && value >= 0;

  switch (step) {
    case "basics": {
      const problems: string[] = [];
      if (draft.title.trim().length < limits.titleMin) {
        problems.push(`Give the flat a title of at least ${limits.titleMin} letters.`);
      }
      if (!ISO_DATE.test(draft.availableFrom)) problems.push("Say when the room is free from.");
      return problems;
    }
    case "where": {
      const problems: string[] = [];
      if (draft.locality.trim() === "") problems.push("Choose the area.");
      if (draft.society.trim() === "") problems.push("Add the building or society name.");
      if (draft.addressLine.trim() === "") problems.push("Add the flat number and street.");
      return problems;
    }
    case "costs": {
      const problems: string[] = [];
      if (!whole(draft.rent) || draft.rent < limits.rentMin || draft.rent > limits.rentMax) {
        problems.push("Enter the monthly rent in whole rupees.");
      }
      if (!whole(draft.maintenance) || !whole(draft.utilitiesEstimate)) {
        problems.push("Maintenance and bills must be whole rupees, or zero.");
      }
      if (!whole(draft.depositMonths) || draft.depositMonths > limits.depositMonthsMax) {
        problems.push(`The deposit can be up to ${limits.depositMonthsMax} months of rent.`);
      }
      return problems;
    }
    case "photos":
      return draft.photos.length < limits.photosMin
        ? [`Choose at least ${limits.photosMin} photos.`]
        : [];
    case "home":
      return [];
    case "preview":
      return LISTING_STEPS.filter((each) => each !== "preview").flatMap((each) =>
        draftProblems(draft, each),
      );
  }
}

/**
 * The lister's flat as a tenant would see it on a card. The private address is
 * left out, the way the server leaves it out for anyone who has not matched.
 */
export function draftAsListing(
  draft: ListingDraft,
  lister: { name: string; about: string },
  id = "preview",
): Listing {
  return {
    id,
    title: draft.title.trim() || "Your flat",
    description: draft.description.trim(),
    city: draft.city,
    locality: draft.locality || draft.city,
    commuteMinutes: null,
    // The preview has no map; a real listing gets its area from the server.
    area: { lat: 0, lng: 0 },
    nearby: [],
    rent: draft.rent,
    maintenance: draft.maintenance,
    utilitiesEstimate: draft.utilitiesEstimate,
    deposit: draft.rent * draft.depositMonths,
    roomType: draft.roomType,
    bhk: draft.bhk,
    furnishing: draft.furnishing,
    availableFrom: ISO_DATE.test(draft.availableFrom)
      ? draft.availableFrom
      : new Date().toISOString().slice(0, 10),
    photos: draft.photos,
    amenities: draft.amenities,
    houseRules: draft.houseRules,
    societyRules: draft.societyRules,
    expectations: draft.expectations,
    lister: {
      name: lister.name.trim() || "You",
      role: "flatmate",
      about: lister.about.trim(),
      flatmateCount: 1,
    },
    compatibility: { percent: 0, reasons: [] },
    isOpen: true,
    isVerified: false,
    isSeed: false,
  };
}
