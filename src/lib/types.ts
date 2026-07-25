export type RestaurantStatus = "want_to_try" | "been" | "favorite";

export type Restaurant = {
  id: string;
  created_by: string | null;
  name: string;
  cuisine: string | null;
  area: string | null;
  city: string | null;
  price_level: number | null;
  price_range: string | null;
  status: RestaurantStatus;
  recommended_by: string | null;
  notes: string | null;
  link: string | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[] | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string;
};

export type Folder = {
  id: string;
  name: string;
};

/* Kept design accents: warm amber = want to try, lilac = been,
   coral = favourite. `pin` doubles as the map marker colour. */
export const STATUS_META: Record<
  RestaurantStatus,
  { label: string; emoji: string; pin: string }
> = {
  want_to_try: { label: "Want to try", emoji: "✨", pin: "#FFB572" },
  been: { label: "Been", emoji: "✓", pin: "#9288E0" },
  favorite: { label: "Favourite", emoji: "♥", pin: "#EA7C69" },
};

export function priceLabel(level: number | null): string {
  if (!level) return "";
  return "$".repeat(Math.min(4, Math.max(1, level)));
}

/** Two-letter monogram for avatar circles ("Jo Lehndorf" → "JL"). */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second =
    parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

/**
 * Media URL for a Google Places photo resource name. Rendered with the
 * public browser key — Google photo media is designed to be fetched
 * client-side; the key's referer restriction still applies.
 */
export function placePhotoUrl(
  photoName: string,
  maxWidthPx: number,
): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || !photoName) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${key}`;
}
