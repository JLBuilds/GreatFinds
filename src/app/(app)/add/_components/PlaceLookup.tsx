"use client";

import { useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { levelFromRangeText, type ListingType } from "@/lib/types";

/** What the Google Places lookup hands back to the form. */
export type LookupResult = {
  type: ListingType;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  price_level: number | null;
  price_range: string | null;
  cuisine: string | null;
  area: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  photos: string[];
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

const FOOD_TYPES = [
  "restaurant",
  "cafe",
  "bar",
  "bakery",
  "meal_takeaway",
  "meal_delivery",
  "food",
  "coffee_shop",
];
const EXPERIENCE_TYPES = [
  "tourist_attraction",
  "amusement_park",
  "aquarium",
  "art_gallery",
  "museum",
  "park",
  "spa",
  "zoo",
  "night_club",
  "movie_theater",
  "bowling_alley",
  "casino",
  "stadium",
  "campground",
  "beach",
];

const HOTEL_TYPES = [
  "lodging",
  "hotel",
  "resort_hotel",
  "motel",
  "guest_house",
  "bed_and_breakfast",
  "hostel",
];
const SHOPPING_TYPES = [
  "store",
  "shopping_mall",
  "clothing_store",
  "department_store",
  "shoe_store",
  "jewelry_store",
  "book_store",
  "electronics_store",
  "furniture_store",
  "home_goods_store",
  "market",
  "supermarket",
  "boutique",
];

/** Guess a place's type from Google's categories. Food wins over hotel
 *  over experience if several appear. Defaults to restaurant. */
function suggestType(types: string[] | undefined): ListingType {
  if (!types) return "restaurant";
  if (types.some((t) => FOOD_TYPES.includes(t) || t.endsWith("_restaurant"))) {
    return "restaurant";
  }
  if (types.some((t) => HOTEL_TYPES.includes(t))) return "hotel";
  if (types.some((t) => SHOPPING_TYPES.includes(t) || t.endsWith("_store"))) {
    return "shopping";
  }
  if (types.some((t) => EXPERIENCE_TYPES.includes(t))) return "experience";
  return "restaurant";
}

/* Shared across Add-form lookup and the detail-page photo backfill. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractPriceRange(j: any): string | null {
  const pr = j?.priceRange;
  if (!pr?.startPrice) return null;
  const cur = pr.startPrice.currencyCode ?? "";
  const start = pr.startPrice.units ?? "";
  const end = pr.endPrice?.units ?? "";
  if (!start) return null;
  return end ? `${cur} ${start}–${end}`.trim() : `${cur} ${start}+`.trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractPhotoNames(j: any): string[] {
  if (!Array.isArray(j?.photos)) return [];
  return j.photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p?.name ?? p?.Eg ?? null)
    .filter((n: unknown): n is string => typeof n === "string" && n.length > 0)
    .slice(0, 8);
}

/** Convert a Google Place JSON (from toJSON()) into our LookupResult.
 *  Shared by the autocomplete widget and the home-screen fallback search. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function placeJsonToLookup(j: any): LookupResult {
  const priceRange = extractPriceRange(j);
  const googleLevel = j.priceLevel ? (PRICE_MAP[j.priceLevel] ?? null) : null;
  const type = suggestType(j.types);
  return {
    type,
    name: j.displayName ?? "",
    address: j.formattedAddress ?? null,
    lat: j.location?.lat ?? null,
    lng: j.location?.lng ?? null,
    google_place_id: j.id ?? null,
    google_maps_url: j.googleMapsURI ?? null,
    // Prefer Google's coarse level; fall back to deriving one from the
    // range so the place is still filterable by price.
    price_level: googleLevel ?? levelFromRangeText(priceRange, type),
    price_range: priceRange,
    cuisine: cuisineFromTypes(j.types),
    area:
      componentText(j.addressComponents, "sublocality") ??
      componentText(j.addressComponents, "neighborhood"),
    city:
      componentText(j.addressComponents, "locality") ??
      componentText(j.addressComponents, "postal_town") ??
      componentText(j.addressComponents, "administrative_area_level_2"),
    country: componentText(j.addressComponents, "country"),
    website: j.websiteURI ?? null,
    photos: extractPhotoNames(j),
  };
}

export function PlaceAutocomplete({
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
            "priceRange",
            "types",
            "websiteURI",
            "addressComponents",
            "photos",
          ],
        });
        const j = place.toJSON();
        onSelectRef.current(placeJsonToLookup(j));
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
      <p className="rounded-lg bg-card/60 px-4 py-3 font-display text-xs text-fog">
        Google lookup isn&apos;t configured — fill the fields in manually, or
        add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </p>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <PlaceAutocomplete onSelect={onSelect} />
    </APIProvider>
  );
}
