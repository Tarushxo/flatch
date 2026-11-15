import type { City, HouseRule, Listing } from "@repo/shared";
import { GENERATED_CITY_CENTRES, GENERATED_LOCALITY_CENTRES, GENERATED_SPECS } from "./city-flats";
import { PHOTO_COLORS } from "./photo-colors";

/*
 * The demo flats: real localities, invented homes. This one list feeds both
 * the seed script that fills the database and the in-browser mock, so the two
 * can never show different flats. Bangalore and Gurgaon are written out here;
 * every city also gets generated flats from city-flats.ts.
 *
 * Nothing in this file touches the database, so it is safe to load in a browser.
 * Photos are free-licence Unsplash images loaded straight from their CDN.
 */

const BEDROOMS = [
  "1771287491132-4954b32210d6",
  "1663756915302-78b3bc4be8f1",
  "1737467026661-31b5a87098fe",
  "1556020685-ae41abfc9365",
  "1758803275226-1bfc87aa6660",
  "1786886393825-a2aff98f5f0a",
  "1775029918191-32e44ee20d06",
  "1661796428175-55423b19409f",
  "1785458034002-94457af51f7c",
  "1700621924212-26db6839d23a",
  "1758098491492-6501dfb2ae7d",
  "1773072525900-e29326544c12",
];

const LIVING_ROOMS = [
  "1583847268964-b28dc8f51f92",
  "1618220179428-22790b461013",
  "1758565811176-ccd94357a844",
  "1724582586458-a51791349977",
  "1772797583328-f83bc3f94f80",
  "1724582586495-d050726cf354",
  "1724582586580-8b52c02e99dd",
  "1600488999593-83309d5d766e",
  "1724582586508-8f06117dc979",
  "1648536474504-7bbf8a1ee3ab",
  "1784790601988-7915393bc5a1",
  "1564078516393-cf04bd966897",
  "1600210491892-03d54c0aaf87",
  "1649083048770-82e8ffd80431",
];

const KITCHENS = [
  "1593853761096-d0423b545cf9",
  "1737233463795-34fccdfc67bb",
  "1738168362059-44a0b8a80b39",
  "1597497522150-2f50bffea452",
  "1574377250314-360968d9d54a",
  "1787790630691-9c11d1c16c87",
  "1770757587087-766db2874c21",
  "1758974835125-83ba4f9d7e25",
  "1737233459465-8eaf6c7d8856",
  "1737233451637-9fd32d96eb26",
  "1615803795424-a477dc508acf",
  "1659205638001-c06fa01e03e4",
  "1737737241535-f81c4bbe0f5c",
];

const BALCONIES = [
  "1524549207884-e7d1130ae2f3",
  "1693585576674-2e1b7166f583",
  "1652676229684-3b89be489c73",
  "1590058582642-b130d1620a49",
  "1661012285381-572e22395dc2",
  "1658048806267-3f105f32d770",
  "1708098845553-1045ea0f9069",
  "1543558526-35fdd56df604",
  "1616424525183-4042d746ac85",
  "1792209353158-cedcbe6d8ac7",
  "1597776862145-cbac3a4085ab",
  "1618237693938-0fbc85b93774",
  "1730204880386-1587173e16e7",
  "1583610484425-ace9573638c4",
];

const FALLBACK_COLOR = "#3a3050";

function photo(id: string, roomTag: Listing["photos"][number]["roomTag"]) {
  return {
    url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop`,
    roomTag,
    dominantColor: PHOTO_COLORS[id] ?? FALLBACK_COLOR,
  };
}

/**
 * The photos a lister can pick from when posting a flat. Uploading your own
 * arrives with the backend (M2), when there is somewhere to store them.
 */
export const SAMPLE_PHOTOS: Listing["photos"] = [
  ...BEDROOMS.slice(0, 6).map((id) => photo(id, "bedroom")),
  ...LIVING_ROOMS.slice(0, 6).map((id) => photo(id, "living")),
  ...KITCHENS.slice(0, 6).map((id) => photo(id, "kitchen")),
  ...BALCONIES.slice(0, 6).map((id) => photo(id, "balcony")),
];

function photosFor(position: number): Listing["photos"] {
  const pick = (ids: string[]) => ids[position % ids.length] as string;
  return [
    photo(pick(BEDROOMS), "bedroom"),
    photo(pick(LIVING_ROOMS), "living"),
    photo(pick(KITCHENS), "kitchen"),
    photo(pick(BALCONIES), "balcony"),
  ];
}

/** An ISO date a number of days from today, so mock dates never look stale. */
function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const yes = (label: string): HouseRule => ({ label, allowed: true });
const no = (label: string): HouseRule => ({ label, allowed: false });

const RULES = {
  easygoing: [yes("Overnight guests"), yes("Alcohol"), no("Smoking indoors"), yes("Pets")],
  vegHome: [no("Non-veg cooking"), no("Smoking"), no("Alcohol"), yes("Guests until 10 pm")],
  quiet: [no("Overnight guests"), no("Parties"), no("Pets"), yes("Non-veg cooking")],
  social: [
    yes("Weekend get-togethers"),
    yes("Smoking on the balcony"),
    yes("Pets"),
    yes("Overnight guests"),
  ],
} satisfies Record<string, HouseRule[]>;

const SOCIETY = {
  standard: [
    "Visitors until 10:30 pm",
    "Bachelors allowed",
    "One covered parking slot",
    "Move-in charge ₹2,000",
  ],
  strict: ["Main gate closes at 11 pm", "No pets in common areas", "Two-wheeler parking only"],
  gated: [
    "24-hour security, visitors sign in",
    "Pets allowed with registration",
    "Clubhouse and gym included",
  ],
};

const EXPECT = {
  tidy: [
    "Share the weekly cleaning",
    "Split groceries for shared staples",
    "Stay at least 6 months",
  ],
  quiet: ["Keep it quiet after 11 pm on weeknights", "No shoes inside", "Give a month's notice"],
  easy: ["Pay rent by the 5th", "Tell us before guests stay over", "Be kind to the cat"],
};

// Approximate centres of real localities, by name.
const LOCALITY_CENTRES: Record<string, { lat: number; lng: number }> = {
  "HSR Layout": { lat: 12.9116, lng: 77.6474 },
  Indiranagar: { lat: 12.9719, lng: 77.6412 },
  Jayanagar: { lat: 12.9308, lng: 77.5838 },
  Bellandur: { lat: 12.9304, lng: 77.6784 },
  Koramangala: { lat: 12.9352, lng: 77.6245 },
  "BTM Layout": { lat: 12.9166, lng: 77.6101 },
  Domlur: { lat: 12.961, lng: 77.6387 },
  Whitefield: { lat: 12.9698, lng: 77.75 },
  "JP Nagar": { lat: 12.9063, lng: 77.5857 },
  Hebbal: { lat: 13.0358, lng: 77.597 },
  Marathahalli: { lat: 12.9591, lng: 77.6974 },
  Malleshwaram: { lat: 13.0031, lng: 77.5643 },
  "Electronic City": { lat: 12.8452, lng: 77.6602 },
  // Gurgaon
  "DLF Phase 2": { lat: 28.488, lng: 77.089 },
  "DLF Phase 3": { lat: 28.4935, lng: 77.0995 },
  "DLF Phase 4": { lat: 28.4672, lng: 77.0817 },
  "Sector 56": { lat: 28.424, lng: 77.1 },
  "Golf Course Road": { lat: 28.442, lng: 77.101 },
  "Sushant Lok": { lat: 28.462, lng: 77.078 },
  "Sohna Road": { lat: 28.407, lng: 77.042 },
  "Palam Vihar": { lat: 28.51, lng: 77.033 },
};
const CITY_CENTRES: Record<City, { lat: number; lng: number }> = GENERATED_CITY_CENTRES;

/** Every locality the seed data uses, with its city and approximate centre. */
export function seedLocalities(flats: Pick<Listing, "city" | "locality">[]) {
  const seen = new Map<string, { city: City; name: string; lat: number; lng: number }>();
  for (const flat of flats) {
    const centre =
      LOCALITY_CENTRES[flat.locality] ??
      GENERATED_LOCALITY_CENTRES[flat.locality] ??
      CITY_CENTRES[flat.city];
    seen.set(`${flat.city}/${flat.locality}`, { city: flat.city, name: flat.locality, ...centre });
  }
  return [...seen.values()];
}

/** A point a few hundred metres from the locality centre, different for each flat. */
function areaFor(locality: string, city: City, position: number) {
  const centre =
    LOCALITY_CENTRES[locality] ?? GENERATED_LOCALITY_CENTRES[locality] ?? CITY_CENTRES[city];
  const angle = position * 2.4;
  const reach = 0.002 + (position % 4) * 0.0012;
  return {
    lat: Number((centre.lat + Math.sin(angle) * reach).toFixed(5)),
    lng: Number((centre.lng + Math.cos(angle) * reach).toFixed(5)),
  };
}

const NEARBY = [
  ["Metro 600 m", "Grocery 200 m", "Gym nearby"],
  ["Bus stop 150 m", "Park 300 m", "Pharmacy 250 m"],
  ["Metro 1.1 km", "Supermarket 400 m", "Cafes on the street"],
  ["Tech park 900 m", "Hospital 1.5 km", "Grocery 300 m"],
];

/** Everything needed to describe one mock flat; the rest is filled in when the list is built. */
export type Spec = Pick<
  Listing,
  | "title"
  | "description"
  | "locality"
  | "commuteMinutes"
  | "rent"
  | "maintenance"
  | "utilitiesEstimate"
  | "roomType"
  | "bhk"
  | "furnishing"
  | "amenities"
  | "lister"
  | "compatibility"
  | "isVerified"
> & {
  depositMonths: number;
  availableIn: number;
  rules: keyof typeof RULES;
  society: keyof typeof SOCIETY;
  expect: keyof typeof EXPECT;
  stretchLabel?: string;
  /** Left out for Bangalore, which most of the flats are in. */
  city?: City;
};

const SPECS: Spec[] = [
  {
    title: "Sunny room in a 2BHK near the park",
    description:
      "East-facing room with an attached bathroom. The flat is on the third floor with a lift, five minutes from the 27th Main cafes.",
    locality: "HSR Layout",
    commuteMinutes: 20,
    rent: 18500,
    maintenance: 2000,
    utilitiesEstimate: 1400,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 2,
    furnishing: "furnished",
    availableIn: 12,
    amenities: ["Wifi", "Air conditioned", "Lift", "Power backup", "Washing machine"],
    rules: "easygoing",
    society: "standard",
    expect: "tidy",
    lister: {
      name: "Ananya",
      role: "flatmate",
      about: "Product designer, hybrid. Home most evenings, out on weekends.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 94,
      reasons: ["Well within your budget", "20 min to work", "Both tidy and early risers"],
    },
    isVerified: true,
  },
  {
    title: "Top-floor room with a terrace",
    description:
      "A quiet top-floor flat with a shared terrace garden. Good light all day and a breeze in the evenings.",
    locality: "Indiranagar",
    commuteMinutes: 25,
    rent: 24000,
    maintenance: 2500,
    utilitiesEstimate: 1600,
    depositMonths: 4,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 5,
    amenities: ["Wifi", "Air conditioned", "Terrace", "Parking", "Cook"],
    rules: "social",
    society: "standard",
    expect: "easy",
    lister: {
      name: "Rohan",
      role: "flatmate",
      about: "Works in fintech. Cooks on Sundays and always makes too much.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 91,
      reasons: ["Fine with pets, like you", "Guests welcome", "25 min to work"],
      caution: "Night owls, and you are an early riser",
    },
    isVerified: true,
  },
  {
    title: "Vegetarian home, calm and spotless",
    description:
      "A family-owned flat let to working professionals. Meals from the tiffin service downstairs if you want them.",
    locality: "Jayanagar",
    commuteMinutes: 35,
    rent: 14000,
    maintenance: 1200,
    utilitiesEstimate: 1100,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 2,
    furnishing: "semi_furnished",
    availableIn: 20,
    amenities: ["Wifi", "Power backup", "Lift", "Water purifier"],
    rules: "vegHome",
    society: "strict",
    expect: "quiet",
    lister: {
      name: "Mrs. Rao",
      role: "owner",
      about: "Owner, lives in the next building. Easy to reach and quick with repairs.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 88,
      reasons: ["Both vegetarian", "₹2,700 under your budget", "Spotless, like you prefer"],
      caution: "35 min commute, close to your limit",
    },
    isVerified: true,
  },
  {
    title: "Lake-view room in a gated society",
    description: "Tenth floor, facing the lake. The society has a pool, a gym and a running track.",
    locality: "Bellandur",
    commuteMinutes: 15,
    rent: 21000,
    maintenance: 3500,
    utilitiesEstimate: 1800,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 8,
    amenities: ["Wifi", "Air conditioned", "Pool", "Gym", "Parking", "Power backup"],
    rules: "easygoing",
    society: "gated",
    expect: "tidy",
    lister: {
      name: "Karthik",
      role: "flatmate",
      about: "Engineer at a startup down the road. Runs in the mornings.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 87,
      reasons: ["15 min to work", "Gym in the building", "Similar work hours"],
    },
    isVerified: false,
  },
  {
    title: "Budget room near Forum Mall",
    description: "A simple, clean room in a walk-up building. Buses and the metro are both close.",
    locality: "Koramangala",
    commuteMinutes: 25,
    rent: 12500,
    maintenance: 800,
    utilitiesEstimate: 1000,
    depositMonths: 2,
    roomType: "shared_room",
    bhk: 2,
    furnishing: "semi_furnished",
    availableIn: 3,
    amenities: ["Wifi", "Washing machine", "Water purifier"],
    rules: "quiet",
    society: "strict",
    expect: "quiet",
    lister: {
      name: "Sneha",
      role: "flatmate",
      about: "Final-year student. Studies late, quiet most of the time.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 84,
      reasons: ["₹5,700 under your budget", "Available this week", "Quiet household"],
      caution: "Shared room, and you asked for a private one",
    },
    isVerified: false,
  },
  {
    title: "Whole 1BHK, newly painted",
    description:
      "The whole flat to yourself. New paint, new geyser, and a balcony that gets the morning sun.",
    locality: "BTM Layout",
    commuteMinutes: 30,
    rent: 19000,
    maintenance: 1500,
    utilitiesEstimate: 1500,
    depositMonths: 5,
    roomType: "whole_flat",
    bhk: 1,
    furnishing: "unfurnished",
    availableIn: 15,
    amenities: ["Parking", "Power backup", "Balcony"],
    rules: "easygoing",
    society: "standard",
    expect: "easy",
    lister: {
      name: "Mr. Iyer",
      role: "owner",
      about: "Owner, lives in Chennai. A caretaker in the building handles things.",
      flatmateCount: 0,
    },
    compatibility: {
      percent: 82,
      reasons: ["A whole flat within budget", "Pets allowed", "Morning sun"],
      caution: "Unfurnished: you would need to bring everything",
    },
    isVerified: true,
  },
  {
    title: "Room in a flat full of plants",
    description:
      "Two flatmates, forty-one plants, one very calm cat. Big windows and a reading corner.",
    locality: "Domlur",
    commuteMinutes: 20,
    rent: 20000,
    maintenance: 1800,
    utilitiesEstimate: 1300,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 25,
    amenities: ["Wifi", "Air conditioned", "Washing machine", "Balcony"],
    rules: "easygoing",
    society: "standard",
    expect: "easy",
    lister: {
      name: "Meera",
      role: "flatmate",
      about: "Writer, works from home. Will absolutely ask you to water things.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 80,
      reasons: ["Both work from home", "Fine with pets, like you", "20 min to work"],
    },
    isVerified: true,
  },
  {
    title: "Modern room close to the tech park",
    description: "A new building ten minutes' walk from the office gates. Fast lift, fast wifi.",
    locality: "Whitefield",
    commuteMinutes: 10,
    rent: 17000,
    maintenance: 2200,
    utilitiesEstimate: 1500,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 2,
    furnishing: "furnished",
    availableIn: 10,
    amenities: ["Wifi", "Air conditioned", "Lift", "Gym", "Power backup"],
    rules: "quiet",
    society: "gated",
    expect: "tidy",
    lister: {
      name: "Arjun",
      role: "flatmate",
      about: "Data engineer. Mostly at the office, plays badminton on weekends.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 78,
      reasons: ["10 min to work", "Within budget", "Tidy household"],
      caution: "No overnight guests",
    },
    isVerified: false,
  },
  {
    title: "Corner room with two balconies",
    description:
      "A corner flat with cross-ventilation and two small balconies. Markets and a park nearby.",
    locality: "JP Nagar",
    commuteMinutes: 35,
    rent: 15500,
    maintenance: 1400,
    utilitiesEstimate: 1200,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 3,
    furnishing: "semi_furnished",
    availableIn: 18,
    amenities: ["Wifi", "Balcony", "Parking", "Water purifier"],
    rules: "vegHome",
    society: "standard",
    expect: "quiet",
    lister: {
      name: "Divya",
      role: "flatmate",
      about: "Teacher. Early to bed, up for the sunrise walk.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 76,
      reasons: ["Both early risers", "₹1,900 under your budget", "Both vegetarian"],
      caution: "35 min commute",
    },
    isVerified: true,
  },
  {
    title: "Studio-style room with its own entrance",
    description:
      "A self-contained room with a kitchenette and a separate entrance, on the ground floor of a house.",
    locality: "Hebbal",
    commuteMinutes: 40,
    rent: 16000,
    maintenance: 0,
    utilitiesEstimate: 1300,
    depositMonths: 2,
    roomType: "whole_flat",
    bhk: 1,
    furnishing: "furnished",
    availableIn: 7,
    amenities: ["Wifi", "Air conditioned", "Parking", "Garden"],
    rules: "quiet",
    society: "strict",
    expect: "quiet",
    lister: {
      name: "Mr. Fernandes",
      role: "owner",
      about: "Retired, lives upstairs with his wife. Friendly and respects privacy.",
      flatmateCount: 0,
    },
    compatibility: {
      percent: 73,
      reasons: ["Your own entrance", "No maintenance fee", "Furnished"],
      caution: "40 min commute, over your limit",
    },
    isVerified: false,
    stretchLabel: "5 min over your commute limit",
  },
  {
    title: "Big room in a house-share of four",
    description:
      "A lively flat with a long dining table and a projector. Friday film nights are a house tradition.",
    locality: "Marathahalli",
    commuteMinutes: 20,
    rent: 13500,
    maintenance: 1500,
    utilitiesEstimate: 1200,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 4,
    furnishing: "furnished",
    availableIn: 2,
    amenities: ["Wifi", "Washing machine", "Cook", "Power backup"],
    rules: "social",
    society: "standard",
    expect: "easy",
    lister: {
      name: "Vikram",
      role: "flatmate",
      about: "Runs the house WhatsApp group with an iron fist and many memes.",
      flatmateCount: 3,
    },
    compatibility: {
      percent: 71,
      reasons: ["₹3,800 under your budget", "Available now", "Guests welcome"],
      caution: "A busier household than you prefer",
    },
    isVerified: false,
  },
  {
    title: "Premium room, fully serviced",
    description:
      "Housekeeping three times a week, all bills included, and a rooftop lounge. Walking distance to the metro.",
    locality: "Koramangala",
    commuteMinutes: 25,
    rent: 28000,
    maintenance: 0,
    utilitiesEstimate: 0,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 2,
    furnishing: "furnished",
    availableIn: 4,
    amenities: ["Wifi", "Air conditioned", "Housekeeping", "Gym", "Lift", "Power backup"],
    rules: "easygoing",
    society: "gated",
    expect: "tidy",
    lister: {
      name: "Priya",
      role: "flatmate",
      about: "Consultant, travels two weeks a month. The flat is often all yours.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 69,
      reasons: ["All bills included", "Housekeeping", "Flatmate often away"],
      caution: "₹6,100 over your budget",
    },
    isVerified: true,
    stretchLabel: "₹6,100 over budget",
  },
  {
    title: "Quiet room on a leafy lane",
    description:
      "An older building on a tree-lined street. High ceilings, red-oxide floors, a slow ceiling fan.",
    locality: "Malleshwaram",
    commuteMinutes: 45,
    rent: 13000,
    maintenance: 600,
    utilitiesEstimate: 900,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 2,
    furnishing: "semi_furnished",
    availableIn: 30,
    amenities: ["Wifi", "Balcony", "Water purifier"],
    rules: "vegHome",
    society: "strict",
    expect: "quiet",
    lister: {
      name: "Lakshmi",
      role: "flatmate",
      about: "Researcher. Likes filter coffee, old films and a quiet house.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 66,
      reasons: ["₹5,400 under your budget", "Quiet household", "Both vegetarian"],
      caution: "45 min commute, over your limit",
    },
    isVerified: false,
    stretchLabel: "10 min over your commute limit",
  },
  {
    title: "New-build room near Electronic City",
    description:
      "Brand-new flat in a large society. Shuttle buses to the tech parks leave from the gate.",
    locality: "Electronic City",
    commuteMinutes: 30,
    rent: 11000,
    maintenance: 1800,
    utilitiesEstimate: 1100,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 3,
    furnishing: "unfurnished",
    availableIn: 14,
    amenities: ["Lift", "Gym", "Parking", "Power backup", "Pool"],
    rules: "quiet",
    society: "gated",
    expect: "tidy",
    lister: {
      name: "Nikhil",
      role: "flatmate",
      about: "Just moved to the city. Looking for flatmates to set the place up with.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 63,
      reasons: ["₹6,100 under your budget", "Gym and pool", "Brand new"],
      caution: "Unfurnished, and no wifi yet",
    },
    isVerified: false,
  },
  // --- Gurgaon ---
  {
    city: "Gurgaon",
    title: "Bright room near the Rapid Metro",
    description:
      "A corner room on the eighth floor, five minutes' walk from the Phase 2 station. Offices in Cyber City are one stop away.",
    locality: "DLF Phase 2",
    commuteMinutes: 15,
    rent: 22000,
    maintenance: 2500,
    utilitiesEstimate: 1600,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 9,
    amenities: ["Wifi", "Air conditioned", "Lift", "Power backup", "Washing machine"],
    rules: "easygoing",
    society: "gated",
    expect: "tidy",
    lister: {
      name: "Ishita",
      role: "flatmate",
      about: "Works in consulting. Out early, back late, reads on Sundays.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 93,
      reasons: ["15 min to work", "Within your budget", "Both tidy"],
    },
    isVerified: true,
  },
  {
    city: "Gurgaon",
    title: "Room in a builder floor with a terrace",
    description:
      "The second floor of a quiet builder floor, with the terrace above shared between two flats. Markets are a short walk away.",
    locality: "Sector 56",
    commuteMinutes: 25,
    rent: 16500,
    maintenance: 1000,
    utilitiesEstimate: 1400,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 3,
    furnishing: "semi_furnished",
    availableIn: 4,
    amenities: ["Wifi", "Terrace", "Parking", "Water purifier"],
    rules: "vegHome",
    society: "strict",
    expect: "quiet",
    lister: {
      name: "Mr. Khanna",
      role: "owner",
      about: "Owner, lives on the ground floor. Fixes things the day you ask.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 89,
      reasons: ["Both vegetarian", "₹3,100 under your budget", "Quiet household"],
      caution: "25 min commute",
    },
    isVerified: true,
  },
  {
    city: "Gurgaon",
    title: "High-rise room with a skyline view",
    description:
      "Eighteenth floor in a condominium on Golf Course Road. Pool, gym and a shuttle to the metro.",
    locality: "Golf Course Road",
    commuteMinutes: 20,
    rent: 30000,
    maintenance: 4000,
    utilitiesEstimate: 2000,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 14,
    amenities: ["Wifi", "Air conditioned", "Pool", "Gym", "Parking", "Power backup"],
    rules: "social",
    society: "gated",
    expect: "easy",
    lister: {
      name: "Kabir",
      role: "flatmate",
      about: "Product manager. Hosts a board-game night most Fridays.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 85,
      reasons: ["Gym and pool", "Guests welcome", "20 min to work"],
      caution: "₹6,000 over your budget",
    },
    isVerified: true,
    stretchLabel: "₹6,000 over budget",
  },
  {
    city: "Gurgaon",
    title: "Whole 1BHK in Sushant Lok",
    description:
      "A compact one-bedroom flat to yourself, with a kitchen, a small balcony and a guard at the gate.",
    locality: "Sushant Lok",
    commuteMinutes: 20,
    rent: 24000,
    maintenance: 1500,
    utilitiesEstimate: 1800,
    depositMonths: 2,
    roomType: "whole_flat",
    bhk: 1,
    furnishing: "semi_furnished",
    availableIn: 20,
    amenities: ["Parking", "Power backup", "Balcony", "Lift"],
    rules: "easygoing",
    society: "standard",
    expect: "easy",
    lister: {
      name: "Mrs. Bhatia",
      role: "owner",
      about: "Owner, lives in Delhi. Friendly on the phone and prompt with paperwork.",
      flatmateCount: 0,
    },
    compatibility: {
      percent: 82,
      reasons: ["A whole flat to yourself", "Pets allowed", "20 min to work"],
    },
    isVerified: false,
  },
  {
    city: "Gurgaon",
    title: "Budget room off Sohna Road",
    description:
      "A plain, clean room in a new society. Shared cabs to the office parks leave from the gate each morning.",
    locality: "Sohna Road",
    commuteMinutes: 35,
    rent: 12000,
    maintenance: 1800,
    utilitiesEstimate: 1200,
    depositMonths: 2,
    roomType: "shared_room",
    bhk: 3,
    furnishing: "semi_furnished",
    availableIn: 2,
    amenities: ["Wifi", "Lift", "Gym", "Power backup"],
    rules: "quiet",
    society: "gated",
    expect: "tidy",
    lister: {
      name: "Tanvi",
      role: "flatmate",
      about: "First job, first flat. Looking for someone easy to share with.",
      flatmateCount: 2,
    },
    compatibility: {
      percent: 77,
      reasons: ["₹7,000 under your budget", "Available now", "Gym in the building"],
      caution: "Shared room, and 35 min commute",
    },
    isVerified: false,
  },
  {
    city: "Gurgaon",
    title: "Room five minutes from Cyber City",
    description:
      "Walk to work. A modern flat with a cook who comes twice a day and a balcony that faces the park.",
    locality: "DLF Phase 3",
    commuteMinutes: 10,
    rent: 26000,
    maintenance: 2000,
    utilitiesEstimate: 1700,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 2,
    furnishing: "furnished",
    availableIn: 11,
    amenities: ["Wifi", "Air conditioned", "Cook", "Balcony", "Power backup"],
    rules: "easygoing",
    society: "standard",
    expect: "easy",
    lister: {
      name: "Aditya",
      role: "flatmate",
      about: "Lawyer. Keeps odd hours and makes very good coffee.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 80,
      reasons: ["10 min to work", "Cook included", "Similar work hours"],
      caution: "Night owl, and you are an early riser",
    },
    isVerified: true,
  },
  {
    city: "Gurgaon",
    title: "Garden-facing room in Palam Vihar",
    description:
      "The ground floor of a family house with its own small garden. Calm, green and a little out of the way.",
    locality: "Palam Vihar",
    commuteMinutes: 40,
    rent: 14000,
    maintenance: 0,
    utilitiesEstimate: 1300,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 2,
    furnishing: "furnished",
    availableIn: 25,
    amenities: ["Wifi", "Garden", "Parking", "Water purifier"],
    rules: "vegHome",
    society: "strict",
    expect: "quiet",
    lister: {
      name: "Mr. Sethi",
      role: "owner",
      about: "Retired colonel. Tends the garden and minds his own business.",
      flatmateCount: 1,
    },
    compatibility: {
      percent: 70,
      reasons: ["No maintenance fee", "Both vegetarian", "A garden"],
      caution: "40 min commute, over your limit",
    },
    isVerified: false,
    stretchLabel: "5 min over your commute limit",
  },
  {
    city: "Gurgaon",
    title: "Lively flat near Galleria",
    description:
      "Three flatmates, a big living room and a terrace with fairy lights. Galleria market is across the road.",
    locality: "DLF Phase 4",
    commuteMinutes: 15,
    rent: 19500,
    maintenance: 2200,
    utilitiesEstimate: 1500,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 4,
    furnishing: "furnished",
    availableIn: 6,
    amenities: ["Wifi", "Air conditioned", "Terrace", "Washing machine", "Cook"],
    rules: "social",
    society: "standard",
    expect: "easy",
    lister: {
      name: "Naina",
      role: "flatmate",
      about: "Designer. Will ask your opinion on the playlist and then ignore it.",
      flatmateCount: 3,
    },
    compatibility: {
      percent: 74,
      reasons: ["15 min to work", "Within your budget", "Guests welcome"],
      caution: "A busier household than you prefer",
    },
    isVerified: false,
  },
];

/** How many days from today each flat is free, by id. The database keeps this so dates never go stale. */
export const AVAILABLE_IN_DAYS: Record<string, number> = {};

// The hand-written flats come first, so their ids never change when flats are added.
export const SEED_FLATS: Listing[] = [...SPECS, ...GENERATED_SPECS].map((spec, position) => {
  const { depositMonths, availableIn, rules, society, expect, city = "Bangalore", ...rest } = spec;
  const id = `mock-${String(position + 1).padStart(2, "0")}`;
  AVAILABLE_IN_DAYS[id] = availableIn;
  return {
    ...rest,
    city,
    id,
    deposit: spec.rent * depositMonths,
    availableFrom: inDays(availableIn),
    photos: photosFor(position),
    area: areaFor(spec.locality, city, position),
    nearby: NEARBY[position % NEARBY.length] ?? [],
    houseRules: RULES[rules],
    societyRules: SOCIETY[society],
    expectations: EXPECT[expect],
    isOpen: true,
    isSeed: true,
  };
});
