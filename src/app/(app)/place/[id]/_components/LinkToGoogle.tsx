"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkPlaceToGoogle } from "../../../actions";
import { GoogleHits } from "../../../_components/GoogleFallbackSearch";
import { placeJsonToLookup } from "../../../add/_components/PlaceLookup";
import type { Restaurant } from "@/lib/types";

/** For places added by hand (no Google listing attached): search Google
 *  Maps by the place's name and city, and attach the chosen listing —
 *  address, map pin, photos, price and cuisine come along. */
export function LinkToGoogle({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(
    [restaurant.name, restaurant.area, restaurant.city, restaurant.country]
      .filter(Boolean)
      .join(" "),
  );
  const [submitted, setSubmitted] = useState(query);
  const bias =
    restaurant.lat != null && restaurant.lng != null
      ? { lat: restaurant.lat, lng: restaurant.lng }
      : null;

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl bg-card border border-line p-3 text-left hover:border-coral/60"
      >
        <span className="w-10 h-10 rounded-lg bg-coral/15 text-coral flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">
            Connect to Google Maps
          </span>
          <span className="block text-xs text-fog truncate">
            Adds the map pin, address, photos and price
          </span>
        </span>
        <span className="text-coral text-xs font-semibold shrink-0">
          Find →
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-card/60 border border-line p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Google Maps…"
          className="flex-1 min-w-0 rounded-lg bg-card border border-line px-3 py-2 text-sm text-snow placeholder:text-fog/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="rounded-lg bg-coral text-ink px-3 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Search
        </button>
      </form>
      <GoogleHits
        query={submitted}
        bias={bias}
        heading="Pick the matching listing:"
        actionLabel="Link"
        busyLabel="Linking…"
        onPick={async (hit) => {
          const r = placeJsonToLookup(hit.json);
          if (!r.google_place_id) return "That result has no Google id.";
          const result = await linkPlaceToGoogle(restaurant.id, {
            google_place_id: r.google_place_id,
            google_maps_url: r.google_maps_url,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            photos: r.photos,
            cuisine: r.cuisine,
            area: r.area,
            city: r.city,
            country: r.country,
            price_level: r.price_level,
            price_range: r.price_range,
            website: r.website,
            summary: r.summary,
          });
          if (!result.success) return result.error ?? "Couldn't link it.";
          setOpen(false);
          router.refresh();
          return null;
        }}
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="w-full text-xs text-fog hover:text-snow py-1"
      >
        Cancel
      </button>
    </div>
  );
}
