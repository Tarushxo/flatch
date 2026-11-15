"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

/*
 * A small map of a flat's neighbourhood. It shows a glowing circle around the
 * approximate area and never a pin, because the exact address is private
 * until there is a match.
 *
 * The map library is large, so it is downloaded only when the map scrolls
 * near the screen. One map is kept and moved when the flat changes.
 */

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const CIRCLE_RADIUS_M = 400;
const SOURCE = "area";

type Point = { lat: number; lng: number };

/** A circle on the ground, as the ring of points a map layer can draw. */
function circleAround(centre: Point, radiusM: number) {
  const ring: [number, number][] = [];
  const latStep = radiusM / 111_320;
  const lngStep = radiusM / (111_320 * Math.cos((centre.lat * Math.PI) / 180));
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * 2 * Math.PI;
    ring.push([centre.lng + lngStep * Math.cos(angle), centre.lat + latStep * Math.sin(angle)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}

export function AreaMap({ centre, label }: { centre: Point; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const latest = useRef(centre);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  // Wait until the map is about to scroll into view.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!near || !container.current) return;
    let cancelled = false;

    import("maplibre-gl")
      .then(({ Map: MapLibre }) => {
        if (cancelled || !container.current) return;
        const created = new MapLibre({
          container: container.current,
          style: STYLE_URL,
          center: [latest.current.lng, latest.current.lat],
          zoom: 13.6,
          // A picture, not a control: it must not steal scrolls or swipes.
          interactive: false,
          attributionControl: { compact: true },
        });
        map.current = created;
        created.on("load", () => {
          if (cancelled) return;
          created.addSource(SOURCE, {
            type: "geojson",
            data: circleAround(latest.current, CIRCLE_RADIUS_M),
          });
          created.addLayer({
            id: "area-fill",
            type: "fill",
            source: SOURCE,
            paint: { "fill-color": "#22e6ff", "fill-opacity": 0.16 },
          });
          created.addLayer({
            id: "area-glow",
            type: "line",
            source: SOURCE,
            paint: {
              "line-color": "#22e6ff",
              "line-width": 9,
              "line-blur": 9,
              "line-opacity": 0.6,
            },
          });
          created.addLayer({
            id: "area-edge",
            type: "line",
            source: SOURCE,
            paint: { "line-color": "#a6f5ff", "line-width": 2 },
          });
          // The credits start open and only close when the map is touched, which
          // this one never is. Fold them into their "i" button; a tap reopens them.
          const credits = container.current?.querySelector(".maplibregl-ctrl-attrib");
          credits?.classList.remove("maplibregl-compact-show");
          credits?.removeAttribute("open");
          setState("ready");
        });
        created.on("error", () => {
          if (!cancelled && !created.loaded()) setState("failed");
        });
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [near]);

  // Move the same map when a different flat is shown.
  useEffect(() => {
    latest.current = centre;
    const current = map.current;
    if (!current?.loaded()) return;
    current.jumpTo({ center: [centre.lng, centre.lat] });
    const source = current.getSource(SOURCE);
    if (source && "setData" in source) {
      (source as { setData: (data: unknown) => void }).setData(
        circleAround(centre, CIRCLE_RADIUS_M),
      );
    }
  }, [centre]);

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-hairline bg-surface-2">
      <div
        ref={container}
        role="img"
        aria-label={`Map of the area around ${label}`}
        className={`size-full transition-opacity duration-500 ${
          state === "ready" ? "opacity-100" : "opacity-0"
        }`}
      />
      {state !== "ready" ? (
        <p className="absolute inset-0 grid place-items-center px-6 text-center text-fg-3 text-sm">
          {state === "failed"
            ? `The map could not load. This flat is in ${label}.`
            : "Loading map…"}
        </p>
      ) : null}
    </div>
  );
}
