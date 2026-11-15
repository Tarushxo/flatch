import type { City } from "@repo/shared";
import type { Spec } from "./flats";

/*
 * Generated flats, so every city has a full deck. Each city gets the same six
 * kinds of flat twice over (a second round in different localities, with its
 * own wording and prices), placed in six of its real localities and priced
 * for that city. Bangalore and Gurgaon also have hand-written flats in flats.ts.
 *
 * Coordinates are approximate locality centres, good enough for the area map.
 */

type Place = { name: string; lat: number; lng: number };

type CityPlan = {
  centre: { lat: number; lng: number };
  /** How this city's rents compare with the template prices. */
  rentScale: number;
  /** Six localities, one per kind of flat, in template order. */
  places: [Place, Place, Place, Place, Place, Place];
};

// New cities go at the end: flat ids follow this order, and must not change.
const PLANS: Record<City, CityPlan> = {
  Hyderabad: {
    centre: { lat: 17.385, lng: 78.4867 },
    rentScale: 0.95,
    places: [
      { name: "Gachibowli", lat: 17.4401, lng: 78.3489 },
      { name: "Banjara Hills", lat: 17.4126, lng: 78.4482 },
      { name: "Kondapur", lat: 17.4622, lng: 78.3568 },
      { name: "Kukatpally", lat: 17.4849, lng: 78.4138 },
      { name: "Madhapur", lat: 17.4483, lng: 78.3915 },
      { name: "HITEC City", lat: 17.4435, lng: 78.3772 },
    ],
  },
  Pune: {
    centre: { lat: 18.5204, lng: 73.8567 },
    rentScale: 0.9,
    places: [
      { name: "Baner", lat: 18.559, lng: 73.7868 },
      { name: "Kothrud", lat: 18.5074, lng: 73.8077 },
      { name: "Viman Nagar", lat: 18.5679, lng: 73.9143 },
      { name: "Wakad", lat: 18.5975, lng: 73.7636 },
      { name: "Hinjewadi", lat: 18.5913, lng: 73.7389 },
      { name: "Koregaon Park", lat: 18.5362, lng: 73.8939 },
    ],
  },
  Chennai: {
    centre: { lat: 13.0827, lng: 80.2707 },
    rentScale: 0.9,
    places: [
      { name: "Velachery", lat: 12.9815, lng: 80.218 },
      { name: "Anna Nagar", lat: 13.085, lng: 80.2101 },
      { name: "Adyar", lat: 13.0012, lng: 80.2565 },
      { name: "Porur", lat: 13.0382, lng: 80.1565 },
      { name: "T. Nagar", lat: 13.0418, lng: 80.2341 },
      { name: "Sholinganallur", lat: 12.901, lng: 80.2279 },
    ],
  },
  Mumbai: {
    centre: { lat: 19.076, lng: 72.8777 },
    rentScale: 1.5,
    places: [
      { name: "Andheri West", lat: 19.1364, lng: 72.8296 },
      { name: "Thane West", lat: 19.2183, lng: 72.9781 },
      { name: "Bandra West", lat: 19.0596, lng: 72.8295 },
      { name: "Goregaon East", lat: 19.1663, lng: 72.8526 },
      { name: "Powai", lat: 19.1176, lng: 72.906 },
      { name: "Lower Parel", lat: 18.998, lng: 72.83 },
    ],
  },
  Delhi: {
    centre: { lat: 28.6139, lng: 77.209 },
    rentScale: 1.15,
    places: [
      { name: "Saket", lat: 28.5245, lng: 77.2066 },
      { name: "Dwarka", lat: 28.5921, lng: 77.046 },
      { name: "Hauz Khas", lat: 28.5494, lng: 77.2001 },
      { name: "Lajpat Nagar", lat: 28.5677, lng: 77.2433 },
      { name: "Karol Bagh", lat: 28.6514, lng: 77.1907 },
      { name: "Vasant Kunj", lat: 28.52, lng: 77.159 },
    ],
  },
  Noida: {
    centre: { lat: 28.5355, lng: 77.391 },
    rentScale: 0.95,
    places: [
      { name: "Sector 62", lat: 28.627, lng: 77.365 },
      { name: "Sector 76", lat: 28.567, lng: 77.385 },
      { name: "Sector 50", lat: 28.572, lng: 77.364 },
      { name: "Greater Noida West", lat: 28.61, lng: 77.43 },
      { name: "Sector 137", lat: 28.51, lng: 77.408 },
      { name: "Sector 18", lat: 28.57, lng: 77.321 },
    ],
  },
  Kolkata: {
    centre: { lat: 22.5726, lng: 88.3639 },
    rentScale: 0.75,
    places: [
      { name: "Salt Lake", lat: 22.58, lng: 88.4179 },
      { name: "Behala", lat: 22.4986, lng: 88.3106 },
      { name: "Ballygunge", lat: 22.528, lng: 88.3653 },
      { name: "Rajarhat", lat: 22.622, lng: 88.45 },
      { name: "Park Street", lat: 22.553, lng: 88.352 },
      { name: "New Town", lat: 22.5754, lng: 88.4798 },
    ],
  },
  Ahmedabad: {
    centre: { lat: 23.0225, lng: 72.5714 },
    rentScale: 0.7,
    places: [
      { name: "Satellite", lat: 23.03, lng: 72.517 },
      { name: "Navrangpura", lat: 23.0365, lng: 72.5611 },
      { name: "Bodakdev", lat: 23.04, lng: 72.512 },
      { name: "Vastrapur", lat: 23.038, lng: 72.529 },
      { name: "Prahlad Nagar", lat: 23.012, lng: 72.5108 },
      { name: "SG Highway", lat: 23.07, lng: 72.517 },
    ],
  },
  Bangalore: {
    centre: { lat: 12.9716, lng: 77.5946 },
    rentScale: 1,
    places: [
      { name: "Whitefield", lat: 12.9698, lng: 77.75 },
      { name: "Hebbal", lat: 13.0358, lng: 77.597 },
      { name: "Marathahalli", lat: 12.9591, lng: 77.6974 },
      { name: "Electronic City", lat: 12.8452, lng: 77.6602 },
      { name: "Malleshwaram", lat: 13.0031, lng: 77.5643 },
      { name: "Sarjapur Road", lat: 12.9102, lng: 77.6857 },
    ],
  },
  Gurgaon: {
    centre: { lat: 28.4595, lng: 77.0266 },
    rentScale: 1.05,
    places: [
      { name: "Sector 56", lat: 28.424, lng: 77.1 },
      { name: "Sohna Road", lat: 28.407, lng: 77.042 },
      { name: "DLF Phase 4", lat: 28.4672, lng: 77.0817 },
      { name: "Palam Vihar", lat: 28.51, lng: 77.033 },
      { name: "Sushant Lok", lat: 28.462, lng: 77.078 },
      { name: "Sector 49", lat: 28.412, lng: 77.049 },
    ],
  },
};

/** The six kinds of flat every generated city gets. Prices are before the city's scale. */
const TEMPLATES = [
  {
    title: "Bright corner room in a 3BHK",
    description:
      "A corner room with big windows and its own bathroom, in a well-kept society with a lift. Two flatmates, both working.",
    rent: 19000,
    maintenance: 2000,
    utilitiesEstimate: 1400,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 8,
    commuteMinutes: 20,
    amenities: ["Wifi", "Air conditioned", "Lift", "Power backup", "Washing machine"],
    rules: "easygoing",
    society: "gated",
    expect: "tidy",
    role: "flatmate",
    about: "Works in tech, hybrid. Home most evenings, out on weekends.",
    flatmateCount: 2,
    percent: 92,
    reasons: ["Within your budget", "20 min to work", "Both tidy"],
    isVerified: true,
  },
  {
    title: "Whole 1BHK, freshly painted",
    description:
      "A one-bedroom flat to yourself: new paint, a small balcony that gets the morning sun, and a guard at the gate.",
    rent: 21000,
    maintenance: 1500,
    utilitiesEstimate: 1600,
    depositMonths: 3,
    roomType: "whole_flat",
    bhk: 1,
    furnishing: "semi_furnished",
    availableIn: 16,
    commuteMinutes: 30,
    amenities: ["Parking", "Power backup", "Balcony", "Lift"],
    rules: "easygoing",
    society: "standard",
    expect: "easy",
    role: "owner",
    about: "Owner, lives nearby. Easy to reach and quick with repairs.",
    flatmateCount: 0,
    percent: 86,
    reasons: ["A whole flat to yourself", "Pets allowed", "Morning sun"],
    isVerified: true,
  },
  {
    title: "Top-floor room with a terrace",
    description:
      "A quiet top-floor flat with a shared terrace. Good light all day and a breeze in the evenings.",
    rent: 23000,
    maintenance: 2200,
    utilitiesEstimate: 1500,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 5,
    commuteMinutes: 25,
    amenities: ["Wifi", "Air conditioned", "Terrace", "Parking", "Cook"],
    rules: "social",
    society: "standard",
    expect: "easy",
    role: "flatmate",
    about: "Cooks on Sundays and always makes too much. Friends over most weekends.",
    flatmateCount: 2,
    percent: 83,
    reasons: ["Guests welcome", "Cook included", "25 min to work"],
    caution: "A busier household than you prefer",
    isVerified: false,
  },
  {
    title: "Budget room in a friendly flat",
    description:
      "A simple, clean shared room in a new building. Buses and shared cabs to the office parks stop outside.",
    rent: 11500,
    maintenance: 1200,
    utilitiesEstimate: 1000,
    depositMonths: 2,
    roomType: "shared_room",
    bhk: 3,
    furnishing: "semi_furnished",
    availableIn: 2,
    commuteMinutes: 35,
    amenities: ["Wifi", "Lift", "Water purifier", "Washing machine"],
    rules: "quiet",
    society: "gated",
    expect: "tidy",
    role: "flatmate",
    about: "First job, first flat. Looking for someone easy to share with.",
    flatmateCount: 2,
    percent: 76,
    reasons: ["Well under your budget", "Available now", "Quiet household"],
    caution: "Shared room, and 35 min commute",
    isVerified: false,
  },
  {
    title: "Calm room in a vegetarian home",
    description:
      "A family-owned flat let to working professionals. Spotless, quiet after ten, and close to the market.",
    rent: 15000,
    maintenance: 1000,
    utilitiesEstimate: 1200,
    depositMonths: 2,
    roomType: "private_room",
    bhk: 2,
    furnishing: "semi_furnished",
    availableIn: 21,
    commuteMinutes: 30,
    amenities: ["Wifi", "Power backup", "Water purifier", "Balcony"],
    rules: "vegHome",
    society: "strict",
    expect: "quiet",
    role: "owner",
    about: "Owner, lives in the next building. Respects privacy and expects the same.",
    flatmateCount: 1,
    percent: 72,
    reasons: ["Both vegetarian", "Within your budget", "Spotless, like you prefer"],
    caution: "No overnight guests",
    isVerified: true,
  },
  {
    title: "High-rise room with a city view",
    description:
      "An upper floor in a large condominium, with a pool, a gym and housekeeping twice a week.",
    rent: 27000,
    maintenance: 3500,
    utilitiesEstimate: 1800,
    depositMonths: 3,
    roomType: "private_room",
    bhk: 3,
    furnishing: "furnished",
    availableIn: 12,
    commuteMinutes: 15,
    amenities: ["Wifi", "Air conditioned", "Pool", "Gym", "Housekeeping", "Parking"],
    rules: "easygoing",
    society: "gated",
    expect: "tidy",
    role: "flatmate",
    about: "Travels two weeks a month for work. The flat is often all yours.",
    flatmateCount: 1,
    percent: 68,
    reasons: ["15 min to work", "Gym and pool", "Flatmate often away"],
    caution: "Near the top of your budget",
    isVerified: false,
  },
] as const;

const FLATMATE_NAMES = [
  "Aarav",
  "Diya",
  "Kunal",
  "Sana",
  "Rahul",
  "Tara",
  "Imran",
  "Pooja",
  "Dev",
  "Riya",
  "Farhan",
  "Neha",
  "Siddharth",
  "Anjali",
  "Varun",
  "Zoya",
];

const OWNER_NAMES = [
  "Mr. Reddy",
  "Mrs. Kulkarni",
  "Mr. Subramanian",
  "Mrs. D'Souza",
  "Mr. Mehra",
  "Mrs. Sinha",
  "Mr. Banerjee",
  "Mrs. Shah",
  "Mr. Rao",
  "Mrs. Joshi",
];

/** Round a rent to the nearest ₹500, as listings do. */
function scaled(amount: number, scale: number): number {
  return Math.round((amount * scale) / 500) * 500;
}

const GENERATED_CITIES = Object.keys(PLANS) as City[];
/** The cities with no hand-written flats. Their first round came first, and keeps its ids. */
const FIRST_CITIES = GENERATED_CITIES.filter((city) => city !== "Bangalore" && city !== "Gurgaon");
const DEPTH_CITIES: City[] = ["Bangalore", "Gurgaon"];

/** How the second round of each kind of flat is worded, in template order. */
const SECOND_ROUND = [
  {
    title: "Airy room with an attached bath",
    description:
      "A large room with a wardrobe wall and its own bathroom, on a middle floor with a lift. The two flatmates keep regular hours.",
  },
  {
    title: "Compact 1BHK near the main road",
    description:
      "A tidy one-bedroom flat with a proper kitchen and a utility balcony. Shops and an auto stand are two minutes away.",
  },
  {
    title: "Room in a flat with a rooftop",
    description:
      "A relaxed flat with rooftop access where the household eats together on Fridays. Cross-ventilated and bright.",
  },
  {
    title: "Shared room, bills kept low",
    description:
      "A twin-sharing room with two cupboards and a study table each. The building is new and the water never runs out.",
  },
  {
    title: "Quiet room with a family upstairs",
    description:
      "The owners live on the floor above and let this floor to working people. Peaceful lane, filter coffee most mornings.",
  },
  {
    title: "Tower flat with a clubhouse",
    description:
      "A room on a high floor in a gated tower, with a clubhouse, a jogging track and a co-working room downstairs.",
  },
] as const;

function specFor(city: City, cityIndex: number, index: number, round: 0 | 1): Spec {
  const plan = PLANS[city];
  const template = TEMPLATES[index] as (typeof TEMPLATES)[number];
  const names = template.role === "owner" ? OWNER_NAMES : FLATMATE_NAMES;
  const wording = round === 0 ? template : (SECOND_ROUND[index] ?? template);
  // The second round sits three localities along, costs a little more or less, and is free later.
  const place = plan.places[(index + round * 3) % plan.places.length];
  const priceShift = round === 0 ? 1 : index % 2 === 0 ? 1.08 : 0.93;
  return {
    city,
    title: wording.title,
    description: wording.description,
    locality: place?.name ?? city,
    commuteMinutes: template.commuteMinutes + round * 5,
    rent: scaled(template.rent * priceShift, plan.rentScale),
    maintenance: scaled(template.maintenance, plan.rentScale),
    utilitiesEstimate: template.utilitiesEstimate,
    depositMonths: template.depositMonths,
    roomType: template.roomType,
    bhk: template.bhk,
    furnishing: template.furnishing,
    availableIn: template.availableIn + round * 9,
    amenities: [...template.amenities],
    rules: template.rules,
    society: template.society,
    expect: template.expect,
    lister: {
      name: names[(cityIndex * 3 + index + round * 7) % names.length] ?? "Asha",
      role: template.role,
      about: template.about,
      flatmateCount: template.flatmateCount,
    },
    compatibility: {
      // A little variety between cities and rounds, so the decks are not identical.
      percent: template.percent - (cityIndex % 3) - round * 4,
      reasons: [...template.reasons],
      ...("caution" in template ? { caution: template.caution } : {}),
    },
    isVerified: template.isVerified && round === 0,
  };
}

const KINDS = TEMPLATES.map((_, index) => index);

/**
 * The generated flats, in a fixed order so ids stay stable: the first round
 * for the eight generated cities (as it always was), then their second round,
 * then both rounds for Bangalore and Gurgaon.
 */
export const GENERATED_SPECS: Spec[] = [
  ...FIRST_CITIES.flatMap((city, cityIndex) =>
    KINDS.map((kind) => specFor(city, cityIndex, kind, 0)),
  ),
  ...FIRST_CITIES.flatMap((city, cityIndex) =>
    KINDS.map((kind) => specFor(city, cityIndex, kind, 1)),
  ),
  ...DEPTH_CITIES.flatMap((city, cityIndex) =>
    ([0, 1] as const).flatMap((round) =>
      KINDS.map((kind) => specFor(city, cityIndex, kind, round)),
    ),
  ),
];

/** Locality centres for the generated cities, by name, for the area map. */
export const GENERATED_LOCALITY_CENTRES: Record<string, { lat: number; lng: number }> =
  Object.fromEntries(
    GENERATED_CITIES.flatMap((city) =>
      PLANS[city].places.map((place) => [place.name, { lat: place.lat, lng: place.lng }]),
    ),
  );

/** City centres for the generated cities, used when a locality is not in the list. */
export const GENERATED_CITY_CENTRES = Object.fromEntries(
  GENERATED_CITIES.map((city) => [city, PLANS[city].centre]),
) as Record<City, { lat: number; lng: number }>;
