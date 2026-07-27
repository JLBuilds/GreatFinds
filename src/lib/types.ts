export type RestaurantStatus = "want_to_try" | "been" | "favorite";

export type ListingType = "restaurant" | "experience" | "hotel";

export const LISTING_TYPES: Array<{
  key: ListingType;
  label: string;
  emoji: string;
}> = [
  { key: "restaurant", label: "Restaurant", emoji: "🍽" },
  { key: "experience", label: "Experience", emoji: "🎟" },
  { key: "hotel", label: "Hotel", emoji: "🏨" },
];

export type Restaurant = {
  id: string;
  created_by: string | null;
  type: ListingType;
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

type PriceBand = { level: number; symbol: string; range: string };

/** Preset price bands per listing type — a restaurant's scale is very
 *  different from an experience's. Choosing a band sets both the level
 *  (for filtering) and the human range label shown on listings. */
export const PRICE_BANDS_BY_TYPE: Record<ListingType, PriceBand[]> = {
  restaurant: [
    { level: 1, symbol: "$", range: "Under AED 75" },
    { level: 2, symbol: "$$", range: "AED 75–200" },
    { level: 3, symbol: "$$$", range: "AED 200–400" },
    { level: 4, symbol: "$$$$", range: "AED 400+" },
  ],
  experience: [
    { level: 1, symbol: "$", range: "Under AED 150" },
    { level: 2, symbol: "$$", range: "AED 150–400" },
    { level: 3, symbol: "$$$", range: "AED 400–800" },
    { level: 4, symbol: "$$$$", range: "AED 800+" },
  ],
  hotel: [
    { level: 1, symbol: "$", range: "Under AED 500 / night" },
    { level: 2, symbol: "$$", range: "AED 500–1,000 / night" },
    { level: 3, symbol: "$$$", range: "AED 1,000–2,500 / night" },
    { level: 4, symbol: "$$$$", range: "AED 2,500+ / night" },
  ],
};

const PRICE_THRESHOLDS: Record<ListingType, [number, number, number]> = {
  restaurant: [75, 200, 400],
  experience: [150, 400, 800],
  hotel: [500, 1000, 2500],
};

export function priceBands(type: ListingType | null | undefined): PriceBand[] {
  return PRICE_BANDS_BY_TYPE[type ?? "restaurant"] ?? PRICE_BANDS_BY_TYPE.restaurant;
}

/** The band range string for a price level within a type. */
export function bandRange(
  level: number | null,
  type: ListingType | null | undefined,
): string | null {
  const b = priceBands(type).find((band) => band.level === level);
  return b ? b.range : null;
}

/** Derive a 1–4 level from a price-range string's starting amount, using
 *  the thresholds for the listing's type. Lets places that Google gave a
 *  text range but no level still be filtered by price. */
export function levelFromRangeText(
  text: string | null,
  type: ListingType | null | undefined,
): number | null {
  if (!text) return null;
  const m = text.match(/(\d[\d,]*)/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  if (Number.isNaN(n)) return null;
  const [t1, t2, t3] = PRICE_THRESHOLDS[type ?? "restaurant"];
  if (n < t1) return 1;
  if (n < t2) return 2;
  if (n < t3) return 3;
  return 4;
}

/** The effective price level for filtering: the stored level, or one
 *  derived from the range text (with the listing's type thresholds). */
export function priceLevelOf(r: {
  price_level: number | null;
  price_range: string | null;
  type?: ListingType | null;
}): number | null {
  return r.price_level ?? levelFromRangeText(r.price_range, r.type ?? "restaurant");
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

/** First http(s) URL found in a string, or null. Lets "Recommended by"
 *  hold an article link as well as a person's name. */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

/** "https://www.cntravellerme.com/story/..." → "cntravellerme.com" */
export function prettyDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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
