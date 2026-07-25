"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteRestaurant,
  setRestaurantStatus,
  updateRestaurant,
} from "../../../actions";
import {
  PlaceFields,
  type PlaceDraft,
} from "../../../_components/PlaceFields";
import {
  STATUS_META,
  priceLabel,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

function toDraft(r: Restaurant): PlaceDraft {
  return {
    name: r.name,
    cuisine: r.cuisine ?? "",
    area: r.area ?? "",
    city: r.city ?? "",
    price_level: r.price_level,
    status: r.status,
    recommended_by: r.recommended_by ?? "",
    notes: r.notes ?? "",
    link: r.link ?? "",
    google_place_id: r.google_place_id,
    google_maps_url: r.google_maps_url,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
  };
}

const STATUS_ORDER: RestaurantStatus[] = ["want_to_try", "been", "favorite"];

export function PlaceDetail({
  restaurant,
  addedBy,
  isOwner,
}: {
  restaurant: Restaurant;
  addedBy: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlaceDraft>(toDraft(restaurant));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = STATUS_META[restaurant.status];
  const mapsUrl =
    restaurant.google_maps_url ??
    (restaurant.lat != null && restaurant.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`
      : restaurant.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`
        : null);

  async function cycleStatus() {
    const next =
      STATUS_ORDER[
        (STATUS_ORDER.indexOf(restaurant.status) + 1) % STATUS_ORDER.length
      ];
    setBusy(true);
    await setRestaurantStatus(restaurant.id, next);
    setBusy(false);
    router.refresh();
  }

  async function saveEdits() {
    setBusy(true);
    setError(null);
    const result = await updateRestaurant(restaurant.id, {
      ...draft,
      cuisine: draft.cuisine || null,
      area: draft.area || null,
      city: draft.city || null,
      recommended_by: draft.recommended_by || null,
      notes: draft.notes || null,
      link: draft.link || null,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <main className="max-w-sm mx-auto px-4 pt-6 space-y-5">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-snow">Edit place</h1>
          <button
            onClick={() => {
              setEditing(false);
              setDraft(toDraft(restaurant));
            }}
            className="font-body text-sm text-fog"
          >
            Cancel
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) saveEdits();
          }}
          className="space-y-5"
        >
          <PlaceFields draft={draft} onChange={setDraft} />
          {error ? (
            <p className="font-body text-sm text-coral text-center">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !draft.name.trim()}
            className="w-full bg-coral text-ink rounded-lg py-3 font-body font-medium hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 pt-6 space-y-5">
      <Link href="/" className="font-body text-sm text-fog">
        ← All places
      </Link>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl text-snow leading-tight">
            {restaurant.name}
          </h1>
          <button
            onClick={cycleStatus}
            disabled={busy}
            title="Tap to change status"
            className="shrink-0 rounded-full px-3 py-1.5 font-body text-xs font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: meta.pin }}
          >
            {meta.emoji} {meta.label}
          </button>
        </div>
        <p className="font-body text-sm text-fog">
          {[
            restaurant.cuisine,
            restaurant.area ?? restaurant.city,
            priceLabel(restaurant.price_level),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {restaurant.address ? (
          <p className="font-body text-xs text-fog/80">
            📍 {restaurant.address}
          </p>
        ) : null}
      </header>

      {restaurant.recommended_by || addedBy ? (
        <p className="font-display text-sm text-fog">
          {restaurant.recommended_by
            ? `Recommended by ${restaurant.recommended_by}`
            : null}
          {restaurant.recommended_by && addedBy ? " · " : null}
          {addedBy ? `added by ${addedBy}` : null}
        </p>
      ) : null}

      {restaurant.notes ? (
        <div className="rounded-xl bg-card p-4">
          <p className="font-body text-sm text-snow whitespace-pre-wrap">
            {restaurant.notes}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-coral text-ink rounded-lg py-3 font-body font-medium hover:opacity-90"
          >
            Open in Google Maps →
          </a>
        ) : null}
        {restaurant.link ? (
          <a
            href={restaurant.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-card text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
          >
            Visit link →
          </a>
        ) : null}
      </div>

      {isOwner ? (
        <div className="pt-2 space-y-2">
          <button
            onClick={() => setEditing(true)}
            className="w-full bg-card text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
          >
            Edit details
          </button>
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => deleteRestaurant(restaurant.id)}
                className="flex-1 bg-coral text-ink rounded-lg py-3 font-body font-medium hover:opacity-90"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-card text-snow rounded-lg py-3 font-body"
              >
                Keep it
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full font-body text-sm text-fog/80 py-2"
            >
              Delete this place
            </button>
          )}
        </div>
      ) : null}
    </main>
  );
}
