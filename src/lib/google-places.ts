import "server-only";

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
