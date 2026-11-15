"use client";

import { type City, DEFAULT_CITY } from "@repo/shared";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { AmenityPlaques } from "@/components/motifs/amenity-plaques";
import { VacancySign } from "@/components/motifs/vacancy-sign";
import { api } from "@/lib/api/client";

/**
 * The roadside sign that heads the landing page: the logo on top of a pole,
 * with the VACANCY sign and a stack of plaques hanging under it.
 *
 * The last plaque names the city being searched. It starts on the default
 * city and switches to the visitor's own once their saved profile has been
 * read, so someone looking in Gurgaon sees GURGAON.
 */
export function SignAssembly() {
  const [city, setCity] = useState<City>(DEFAULT_CITY);

  useEffect(() => {
    let current = true;
    // The landing page is open to everyone, so it only looks up the city of someone who
    // already has a session. Asking for a profile without one would send them to sign in.
    api
      .getEntry()
      .then((entry) => (entry.hasSession ? api.getProfile() : null))
      .then((profile) => {
        if (current && profile) setCity(profile.preferences.city);
      })
      .catch(() => {
        // The default city stays on the sign.
      });
    return () => {
      current = false;
    };
  }, []);

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
