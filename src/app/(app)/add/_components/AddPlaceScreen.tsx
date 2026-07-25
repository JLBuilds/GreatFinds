"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRestaurant } from "../../actions";
import {
  EMPTY_DRAFT,
  PlaceFields,
  type PlaceDraft,
} from "../../_components/PlaceFields";
import { PlaceLookup, type LookupResult } from "./PlaceLookup";

export function AddPlaceScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<PlaceDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState(false);

  function applyLookup(r: LookupResult) {
    setDraft((d) => ({
      ...d,
      name: r.name || d.name,
      cuisine: r.cuisine ?? d.cuisine,
      area: r.area ?? d.area,
      city: r.city ?? d.city,
      price_level: r.price_level ?? d.price_level,
      link: d.link || (r.website ?? ""),
      google_place_id: r.google_place_id,
      google_maps_url: r.google_maps_url,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
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

  return (
    <main className="max-w-sm mx-auto px-4 pt-6 space-y-5">
      <header>
        <h1 className="font-display text-3xl text-basil">Add a place</h1>
        <p className="font-display italic text-sm text-basil/60">
          Search Google first — it fills everything in.
        </p>
      </header>

      <PlaceLookup onSelect={applyLookup} />

      {lookedUp ? (
        <p className="font-body text-xs text-mint">
          ✓ Found it — details filled in below. Adjust anything, then save.
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) save();
        }}
        className="space-y-5"
      >
        <PlaceFields draft={draft} onChange={setDraft} />

        {error ? (
          <p className="font-body text-sm text-berry text-center">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !draft.name.trim()}
          className="w-full bg-tomato text-white rounded-full py-3 font-body font-medium hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save place"}
        </button>
      </form>
    </main>
  );
}
