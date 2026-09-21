"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { createRestaurant } from "../../actions";
import {
  EMPTY_DRAFT,
  PlaceFields,
  type PlaceDraft,
} from "../../_components/PlaceFields";
import {
  PlaceAutocomplete,
  placeJsonToLookup,
  type LookupResult,
} from "./PlaceLookup";
import { UrlIngest } from "./UrlIngest";
import { placePhotoUrl, type Folder } from "@/lib/types";

const PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "googleMapsURI",
  "priceLevel",
  "priceRange",
  "types",
  "websiteURI",
  "editorialSummary",
  "addressComponents",
  "photos",
];

/** Arriving from a Google result on the home screen (?place=<id>):
 *  fetch that place once and hand it to the form. */
function PrefillFromPlaceId({
  placeId,
  onResolved,
  onError,
}: {
  placeId: string;
  onResolved: (r: LookupResult) => void;
  onError: (msg: string) => void;
}) {
  const places = useMapsLibrary("places");
  const done = useRef(false);
  useEffect(() => {
    if (!places || done.current) return;
    done.current = true;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const place = new (places as any).Place({ id: placeId });
        await place.fetchFields({ fields: PLACE_FIELDS });
        onResolved(placeJsonToLookup(place.toJSON()));
      } catch (err) {
        console.error("[AddPlace] prefill failed:", err);
        onError("Couldn't load that place from Google — search for it below.");
      }
    })();
  }, [places, placeId, onResolved, onError]);
  return null;
}

export function AddPlaceScreen({ folders }: { folders: Folder[] }) {
  const router = useRouter();
  const prefillId = useSearchParams().get("place");
  const [draft, setDraft] = useState<PlaceDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState(false);

  function applyLookup(r: LookupResult) {
    setDraft((d) => ({
      ...d,
      type: r.type,
      name: r.name || d.name,
      cuisine: r.cuisine ?? d.cuisine,
      area: r.area ?? d.area,
      city: r.city ?? d.city,
      country: r.country ?? d.country,
      price_level: r.price_level ?? d.price_level,
      price_range: r.price_range ?? d.price_range,
      link: d.link || (r.website ?? ""),
      // Google's blurb seeds the notes; the field stays editable.
      notes: d.notes || (r.summary ?? ""),
      google_place_id: r.google_place_id,
      google_maps_url: r.google_maps_url,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      photos: r.photos.length > 0 ? r.photos : d.photos,
    }));
    setLookedUp(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await createRestaurant({
      ...draft,
      cuisine: draft.cuisine || null,
      area: draft.area || null,
      city: draft.city || null,
      recommended_by: draft.recommended_by || null,
      notes: draft.notes || null,
      link: draft.link || null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const heroUrl =
    draft.photos && draft.photos[0]
      ? placePhotoUrl(draft.photos[0], 800)
      : null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <main className="max-w-sm mx-auto px-6 space-y-5">
      {/* Always-visible actions, so Save is reachable without scrolling */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-ink/95 backdrop-blur border-b border-line flex items-center justify-between">
        <Link href="/" className="text-sm text-fog">
          Cancel
        </Link>
        <span className="text-sm font-semibold text-white">Add a place</span>
        <button
          type="submit"
          form="add-place-form"
          disabled={saving || !draft.name.trim()}
          className="rounded-lg bg-coral text-ink px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <header>
        <p className="text-sm text-fog">
          {prefillId
            ? "Details from Google Maps are filled in below. Adjust anything, then save."
            : "Paste a Google Maps link or search — it fills everything in, photos included."}
        </p>
      </header>

      {apiKey ? (
        <APIProvider apiKey={apiKey}>
          {prefillId && !lookedUp ? (
            <PrefillFromPlaceId
              placeId={prefillId}
              onResolved={applyLookup}
              onError={setError}
            />
          ) : null}
          <div className="space-y-3">
            <UrlIngest onResolved={applyLookup} />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line" />
              <span className="text-xs text-fog">or search</span>
              <div className="flex-1 h-px bg-line" />
            </div>
            <PlaceAutocomplete onSelect={applyLookup} />
          </div>
        </APIProvider>
      ) : (
        <p className="rounded-lg bg-card/60 px-4 py-3 text-xs text-fog">
          Google lookup isn&apos;t configured — fill the fields in manually.
        </p>
      )}

      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt={draft.name}
          className="w-full h-40 object-cover rounded-xl border border-line"
        />
      ) : null}

      {lookedUp ? (
        <p className="font-body text-xs text-warm">
          ✓ Found it — details{draft.photos?.length ? " and photos" : ""}{" "}
          filled in below. Adjust anything, then save.
        </p>
      ) : null}

      <form
        id="add-place-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) save();
        }}
        className="space-y-5"
      >
        <PlaceFields draft={draft} onChange={setDraft} folders={folders} />

        {error ? (
          <p className="font-body text-sm text-coral text-center">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !draft.name.trim()}
          className="w-full bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90 disabled:opacity-40 shadow-[0_8px_20px_rgba(234,124,105,0.3)]"
        >
          {saving ? "Saving…" : "Save place"}
        </button>
      </form>
    </main>
  );
}
