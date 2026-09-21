import "server-only";
import type { Amenities, OpeningHours } from "@/lib/hours";

/**
 * Server-side Places API (New) helpers.
 *
 * The public browser key is referer-restricted, so server calls send the
 * app's own URL as the Referer — the same check a browser request passes.
 */
function apiKey(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

function referer(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  );
}

/** Fresh photo resource names for a place (max 8), oldest-first as Google
 *  returns them. Returns [] when the key is missing or Google has none. */
export async function fetchPlacePhotoNames(placeId: string): Promise<string[]> {
  const key = apiKey();
  if (!key || !placeId) return [];
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "photos",
        Referer: referer(),
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error("[google-places] details failed:", res.status, await res.text());
    return [];
  }
  const json = (await res.json()) as { photos?: { name?: string }[] };
  return (json.photos ?? [])
    .map((p) => p?.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0)
    .slice(0, 8);
}

export type PlaceDetailsSync = {
  opening_hours: OpeningHours | null;
  utc_offset_minutes: number | null;
  amenities: Amenities | null;
  phone: string | null;
};

const DETAIL_FIELDS = [
  "regularOpeningHours",
  "utcOffsetMinutes",
  "nationalPhoneNumber",
  "outdoorSeating",
  "reservable",
  "goodForGroups",
  "goodForChildren",
  "allowsDogs",
  "liveMusic",
  "servesCoffee",
  "restroom",
  "parkingOptions",
  "paymentOptions",
].join(",");

/** Hours, phone and amenities for a place. Null when the key is missing
 *  or Google fails; fields Google doesn't have come back null/absent. */
export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetailsSync | null> {
  const key = apiKey();
  if (!key || !placeId) return null;
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": DETAIL_FIELDS,
        Referer: referer(),
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error("[google-places] details failed:", res.status, await res.text());
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (await res.json()) as any;
  const amenities: Amenities = {};
  for (const k of [
    "outdoorSeating",
    "reservable",
    "goodForGroups",
    "goodForChildren",
    "allowsDogs",
    "liveMusic",
    "servesCoffee",
    "restroom",
  ] as const) {
    if (typeof j[k] === "boolean") amenities[k] = j[k];
  }
  if (j.parkingOptions && typeof j.parkingOptions === "object") {
    amenities.parkingOptions = j.parkingOptions;
  }
  if (j.paymentOptions && typeof j.paymentOptions === "object") {
    amenities.paymentOptions = j.paymentOptions;
  }
  const hours = j.regularOpeningHours;
  return {
    opening_hours:
      hours && Array.isArray(hours.periods)
        ? {
            periods: hours.periods,
            weekdayDescriptions: Array.isArray(hours.weekdayDescriptions)
              ? hours.weekdayDescriptions
              : undefined,
          }
        : null,
    utc_offset_minutes:
      typeof j.utcOffsetMinutes === "number" ? j.utcOffsetMinutes : null,
    amenities: Object.keys(amenities).length > 0 ? amenities : null,
    phone: typeof j.nationalPhoneNumber === "string" ? j.nationalPhoneNumber : null,
  };
}
