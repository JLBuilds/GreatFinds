"use client";

import { useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { expandMapsUrl } from "../../actions";
import { placeJsonToLookup, type LookupResult } from "./PlaceLookup";

/** Paste a Google Maps link → resolve it to a place and prefill the form.
 *  Assumes an <APIProvider> ancestor (provided by AddPlaceScreen). */
export function UrlIngest({
  onResolved,
}: {
  onResolved: (r: LookupResult) => void;
}) {
  const places = useMapsLibrary("places");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingest() {
    if (!url.trim() || !places) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = await expandMapsUrl(url);
      if (!parsed.ok || (!parsed.name && parsed.lat == null)) {
        setError(parsed.error ?? "Couldn't read that link.");
        setBusy(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Place } = places as any;
      const fields = [
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
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let placeJson: any | null = null;
      if (parsed.name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req: any = { textQuery: parsed.name, fields, maxResultCount: 1 };
        if (parsed.lat != null && parsed.lng != null) {
          req.locationBias = {
            center: { lat: parsed.lat, lng: parsed.lng },
            radius: 3000,
          };
        }
        const { places: results } = await Place.searchByText(req);
        if (results && results[0]) placeJson = results[0].toJSON();
      }
      if (!placeJson) {
        setError("Couldn't find that place — try the search box below.");
        setBusy(false);
        return;
      }
      onResolved(placeJsonToLookup(placeJson));
      setUrl("");
      setBusy(false);
    } catch (err) {
      console.error("[UrlIngest] failed:", err);
      setError("Couldn't fetch that place — try the search box below.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Google Maps link"
          className="flex-1 rounded-lg bg-card border border-line px-4 py-3 text-sm text-snow placeholder:text-fog/70 focus:outline-none"
        />
        <button
          onClick={ingest}
          disabled={busy || !url.trim() || !places}
          className="rounded-lg bg-coral text-ink px-4 py-3 text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "…" : "Add"}
        </button>
      </div>
      {error ? <p className="text-xs text-coral">{error}</p> : null}
    </div>
  );
}
