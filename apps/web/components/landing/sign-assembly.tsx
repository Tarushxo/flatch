import { type City, DEFAULT_CITY } from "@repo/shared";
import { Logo } from "@/components/logo";
import { AmenityPlaques } from "@/components/motifs/amenity-plaques";
import { VacancySign } from "@/components/motifs/vacancy-sign";

/**
 * The roadside sign that heads the landing page: the logo on top of a pole,
 * with the VACANCY sign and a stack of plaques hanging under it.
 *
 * The last plaque names the city being searched. Pass the person's chosen
 * city once they have one; until then it shows the default.
 */
export function SignAssembly({ city = DEFAULT_CITY }: { city?: City }) {
  return (
    <div className="relative inline-flex flex-col items-start gap-3 pb-10 pl-7">
      {/* The pole */}
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-1.5 rounded-full bg-gradient-to-b from-fg/35 via-fg/15 to-transparent"
      />
      <Logo size="lg" />
      <VacancySign open />
      <AmenityPlaques items={["Rooms", "Flatmates", city]} />
    </div>
  );
}
