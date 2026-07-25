"use client";

import { useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";

/** What the Google Places lookup hands back to the form. */
export type LookupResult = {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  price_level: number | null;
  cuisine: string | null;
  area: string | null;
  city: string | null;
  website: string | null;
};

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/** "italian_restaurant" → "Italian". Ignores the generic types. */
function cuisineFromTypes(types: string[] | undefined): string | null {
  if (!types) return null;
  const specific = types.find(
    (t) => t.endsWith("_restaurant") && t !== "restaurant",
  );
  if (!specific) return null;
  const raw = specific.replace(/_restaurant$/, "").replace(/_/g, " ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function componentText(
  components: Array<{ types: string[]; longText?: string }> | undefined,
  type: string,
): string | null {
  const c = components?.find((c) => c.types.includes(type));
  return c?.longText ?? null;
}

function AutocompleteInner({
  onSelect,
}: {
  onSelect: (r: LookupResult) => void;
}) {
  const places = useMapsLibrary("places");
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!places || !containerRef.current) return;

    // PlaceAutocompleteElement is the Places API (New) widget — the
    // classic Autocomplete isn't available to new Google Maps keys.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = new (places as any).PlaceAutocompleteElement({
      includedRegionCodes: undefined,
    });
    el.setAttribute("placeholder", "Search for the restaurant…");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = async (event: any) => {
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "googleMapsURI",
            "priceLevel",
            "types",
            "websiteURI",
            "addressComponents",
          ],
        });
        const j = place.toJSON();
        onSelectRef.current({
          name: j.displayName ?? "",
          address: j.formattedAddress ?? null,
          lat: j.location?.lat ?? null,
          lng: j.location?.lng ?? null,
          google_place_id: j.id ?? null,
          google_maps_url: j.googleMapsURI ?? null,
          price_level: j.priceLevel ? (PRICE_MAP[j.priceLevel] ?? null) : null,
          cuisine: cuisineFromTypes(j.types),
          area:
            componentText(j.addressComponents, "sublocality") ??
            componentText(j.addressComponents, "neighborhood"),
          city: componentText(j.addressComponents, "locality"),
          website: j.websiteURI ?? null,
        });
      } catch (err) {
        console.error("[PlaceLookup] fetchFields failed:", err);
      }
    };

    el.addEventListener("gmp-select", handler);
    const container = containerRef.current;
    container.appendChild(el);
    return () => {
      el.removeEventListener("gmp-select", handler);
      el.remove();
    };
  }, [places]);

  return <div ref={containerRef} />;
}

export function PlaceLookup({
  onSelect,
}: {
  onSelect: (r: LookupResult) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <p className="rounded-2xl bg-white/50 px-4 py-3 font-display italic text-xs text-basil/60">
        Google lookup isn&apos;t configured — fill the fields in manually, or
        add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </p>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <AutocompleteInner onSelect={onSelect} />
    </APIProvider>
  );
}
