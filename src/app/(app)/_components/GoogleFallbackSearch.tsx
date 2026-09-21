"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { extractPhotoNames } from "../add/_components/PlaceLookup";
import { placePhotoUrl } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Hit = { placeId: string; name: string; address: string | null; json: any };

export type LatLng = { lat: number; lng: number };

type HitsProps = {
  query: string;
  bias: LatLng | null;
  /** What tapping a result does. Return an error message to show, or null. */
  onPick: (hit: Hit) => Promise<string | null>;
  actionLabel: string;
  busyLabel: string;
  heading: string;
};

function Inner({ query, bias, onPick, actionLabel, busyLabel, heading }: HitsProps) {
  const places = useMapsLibrary("places");
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req: any = {
          textQuery: query,
          maxResultCount: 5,
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
        };
        // Prefer places near the user (or near their saved places) so
        // "Nobu" finds the local one, not the one in Malibu.
        if (bias) req.locationBias = { center: bias, radius: 50_000 };
        const { places: results } = await Place.searchByText(req);
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
  }, [places, query, bias]);

  async function pick(hit: Hit) {
    setCreatingId(hit.placeId);
    setError(null);
    const err = await onPick(hit);
    if (err) {
      setCreatingId(null);
      setError(err);
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
      <p className="text-xs text-fog">{heading}</p>
      {hits.map((h) => {
        const names = extractPhotoNames(h.json);
        const photo = names[0] ? placePhotoUrl(names[0], 120) : null;
        return (
          <button
            key={h.placeId}
            onClick={() => pick(h)}
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
              {creatingId === h.placeId ? busyLabel : actionLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Google Maps text-search results with a per-row action. Reused by the
 *  home fallback search (add) and the detail page (link). */
export function GoogleHits(props: HitsProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !props.query.trim()) return null;
  return (
    <APIProvider apiKey={apiKey}>
      <Inner {...props} />
    </APIProvider>
  );
}

/** Google Maps results for a list search, with "tap to add".
 *
 *  - `auto` (default): runs as soon as the user pauses typing — used when
 *    nothing saved matches, so the place they're after just shows up.
 *  - `auto={false}`: a quiet "Not here?" button that expands on tap — used
 *    under partial matches, where Google results would be noise by default.
 *  `bias` centres the search (user location, or where their places are). */
export function GoogleFallbackSearch({
  query,
  bias = null,
  auto = true,
}: {
  query: string;
  bias?: LatLng | null;
  auto?: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(query);

  // Wait for a pause in typing before hitting Google.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 450);
    return () => clearTimeout(t);
  }, [query]);

  // A new query collapses the manual variant back to its button.
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    if (!auto) setOpen(false);
  }

  if (!apiKey || !query.trim()) return null;
  if (!auto && !open) {
    return (
      // Same shape as the result rows it expands into.
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
            Not what you&apos;re after?
          </span>
          <span className="block text-xs text-fog truncate">
            Search Google Maps for “{query}”
          </span>
        </span>
        <span className="text-coral text-xs font-semibold shrink-0">
          Search →
        </span>
      </button>
    );
  }
  if (debounced.trim() !== query.trim()) {
    return (
      <p className="text-sm text-fog text-center py-3">Searching Google Maps…</p>
    );
  }
  return (
    <GoogleHits
      query={debounced.trim()}
      bias={bias}
      heading="From Google Maps — tap to add:"
      actionLabel="Add +"
      busyLabel="Opening…"
      onPick={async (hit) => {
        // Open the Add screen prefilled so folder, status and notes can be
        // set before saving.
        router.push(`/add?place=${encodeURIComponent(hit.placeId)}`);
        return null;
      }}
    />
  );
}
