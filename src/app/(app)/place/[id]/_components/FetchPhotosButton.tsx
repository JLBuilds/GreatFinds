"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { savePlaceMedia } from "../../../actions";
import {
  extractPhotoNames,
  extractPriceRange,
} from "../../../add/_components/PlaceLookup";

function Inner({ id, placeId }: { id: string; placeId: string }) {
  const places = useMapsLibrary("places");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPhotos() {
    if (!places) return;
    setBusy(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const place = new (places as any).Place({ id: placeId });
      await place.fetchFields({ fields: ["photos", "priceRange"] });
      const j = place.toJSON();
      const photos = extractPhotoNames(j);
      const priceRange = extractPriceRange(j);
      if (photos.length === 0 && !priceRange) {
        setError("Google has no photos for this place.");
        setBusy(false);
        return;
      }
      const result = await savePlaceMedia(id, photos, priceRange);
      setBusy(false);
      if (!result.success) {
        setError(result.error ?? "Couldn't save.");
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("[FetchPhotos] failed:", err);
      setError("Photo lookup failed — try again in a minute.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={fetchPhotos}
        disabled={busy || !places}
        className="w-full bg-card border border-dashed border-line text-mist rounded-lg py-3 font-body text-sm hover:border-coral/60 disabled:opacity-50"
      >
        {busy ? "Fetching from Google…" : "✨ Fetch photos & price from Google"}
      </button>
      {error ? (
        <p className="font-body text-xs text-coral text-center">{error}</p>
      ) : null}
    </div>
  );
}

/** Backfill photos/price for entries saved before the photos feature
 *  (or added manually with a Google link). Client-side because the
 *  browser key is referer-restricted to the app's domain. */
export function FetchPhotosButton({
  id,
  placeId,
}: {
  id: string;
  placeId: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  return (
    <APIProvider apiKey={apiKey}>
      <Inner id={id} placeId={placeId} />
    </APIProvider>
  );
}
