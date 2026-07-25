export type RestaurantStatus = "want_to_try" | "been" | "favorite";

export type Restaurant = {
  id: string;
  created_by: string | null;
  name: string;
  cuisine: string | null;
  area: string | null;
  city: string | null;
  price_level: number | null;
  status: RestaurantStatus;
  recommended_by: string | null;
  notes: string | null;
  link: string | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string;
};

export const STATUS_META: Record<
  RestaurantStatus,
  { label: string; emoji: string; pin: string }
> = {
  want_to_try: { label: "Want to try", emoji: "✨", pin: "#EEB64B" },
  been: { label: "Been", emoji: "✓", pin: "#2F9E77" },
  favorite: { label: "Favourite", emoji: "♥", pin: "#B03A5B" },
};

export function priceLabel(level: number | null): string {
  if (!level) return "";
  return "$".repeat(Math.min(4, Math.max(1, level)));
}
