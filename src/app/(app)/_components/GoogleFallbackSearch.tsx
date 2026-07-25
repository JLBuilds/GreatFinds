"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { createRestaurant } from "../actions";
import {
  extractPhotoNames,
  placeJsonToLookup,
} from "../add/_components/PlaceLookup";
import { bandRange, placePhotoUrl } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Hit = { placeId: string; name: string; address: string | null; json: any };

function Inner({ query }: { query: string }) {
  const places = useMapsLibrary("places");
  const router = useRouter();
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!places) return;
    const myReq = ++reqRef.current;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { Place } = places as any;
        const { places: results } = await Place.searchByText({
          textQuery: query,
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
          maxResultCount: 5,
        });
        if (myReq !== reqRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Hit[] = (results ?? []).map((p: any) => {
          const j = p.toJSON();
          return {
            placeId: j.id,
            name: j.displayName ?? "",
            address: j.formattedAddress ?? null,
            json: j,
          };
        });
        setHits(mapped);
      } catch (err) {
        console.error("[FallbackSearch] failed:", err);
        setError("Couldn't reach Google Maps just now.");
      } finally {
        if (myReq === reqRef.current) setLoading(false);
      }
    })();
  }, [places, query]);

  async function create(hit: Hit) {
    setCreatingId(hit.placeId);
    setError(null);
    const r = placeJsonToLookup(hit.json);
    const result = await createRestaurant({
      name: r.name,
      cuisine: r.cuisine,
      area: r.area,
      city: r.city,
      price_level: r.price_level,
      price_range: bandRange(r.price_level) ?? r.price_range,
      status: "want_to_try",
      recommended_by: null,
      notes: null,
      link: r.website,
      google_place_id: r.google_place_id,
      google_maps_url: r.google_maps_url,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      photos: r.photos,
      folder_id: null,
    });
    if (result.success && result.id) {
      router.push(`/place/${result.id}`);
      router.refresh();
    } else {
      setCreatingId(null);
      setError(result.error ?? "Couldn't create the listing.");
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-fog text-center py-3">Searching Google Maps…</p>
    );
  }
  if (error) {
    return <p className="text-sm text-coral text-center py-3">{error}</p>;
  }
  if (!hits || hits.length === 0) {
    return (
      <p className="text-sm text-fog text-center py-3">
        No matches on Google Maps either.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-left">
      <p className="text-xs text-fog">From Google Maps — tap to add:</p>
      {hits.map((h) => {
        const names = extractPhotoNames(h.json);
        const photo = names[0] ? placePhotoUrl(names[0], 120) : null;
        return (
          <button
            key={h.placeId}
            onClick={() => create(h)}
            disabled={!!creatingId}
            className="w-full flex items-center gap-3 rounded-xl bg-card border border-line p-3 text-left hover:border-coral/60 disabled:opacity-50"
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt=""
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-ink flex items-center justify-center text-coral font-semibold shrink-0">
                {h.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {h.name}
              </p>
              {h.address ? (
                <p className="text-xs text-fog truncate">{h.address}</p>
              ) : null}
            </div>
            <span className="text-coral text-xs font-semibold shrink-0">
              {creatingId === h.placeId ? "Adding…" : "Add +"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Shown in the home empty-state: when a search matches nothing saved,
 *  offer to search Google Maps and create a listing from a result. */
export function GoogleFallbackSearch({ query }: { query: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [open, setOpen] = useState(false);
  if (!apiKey || !query.trim()) return null;
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-coral text-ink py-3 text-sm font-semibold hover:opacity-90"
      >
        Search Google Maps for “{query}” →
      </button>
    );
  }
  return (
    <APIProvider apiKey={apiKey}>
      <Inner query={query} />
    </APIProvider>
  );
}
