import { CITIES } from "@repo/shared";
import { Logo } from "@/components/logo";
import { AmenityPlaques } from "@/components/motifs/amenity-plaques";
import { VacancySign } from "@/components/motifs/vacancy-sign";

/**
 * The roadside sign that heads the landing page: the logo on top of a pole,
 * with the VACANCY sign and a stack of plaques hanging under it.
 *
 * The last plaque says how many cities are covered. It used to name one city
 * (the default, or the visitor's own), which read as "Bangalore only" to
 * everyone arriving for the first time, and cost the page three requests to
 * the server to find out. Now the sign is plain markup.
 */
export function SignAssembly() {
  return (
    <div className="relative inline-flex flex-col items-start gap-3 pb-10 pl-7">
      {/* The pole */}
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-1.5 rounded-full bg-gradient-to-b from-fg/35 via-fg/15 to-transparent"
      />
      <Logo size="lg" />
      <VacancySign open />
      <AmenityPlaques items={["Rooms", "Flatmates", `${CITIES.length} cities`]} />
    </div>
  );
}
