import type { z } from "zod";
import { DEFAULT_CITY } from "./constants";
import type { Listing } from "./listing";
import type { ApplicantSchema, ListingDraftSchema, MyListingSchema } from "./schemas";

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
} as const;

/** The steps of posting a flat, in order. */
export const LISTING_STEPS = ["basics", "where", "costs", "photos", "home", "preview"] as const;
export type ListingStep = (typeof LISTING_STEPS)[number];

export type ListingDraft = z.infer<typeof ListingDraftSchema>;
export type MyListing = z.infer<typeof MyListingSchema>;
export type Applicant = z.infer<typeof ApplicantSchema>;

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
