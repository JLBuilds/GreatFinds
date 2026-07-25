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
import { FetchPhotosButton } from "./FetchPhotosButton";
import { FolderPicker } from "./FolderPicker";
import {
  STATUS_META,
  placePhotoUrl,
  prettyDomain,
  priceLabel,
  type Folder,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

/** Render text, turning any http(s) URL into a clickable link labelled
 *  by its domain (so a long article URL reads cleanly). */
function withLinks(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-coral underline underline-offset-2"
      >
        {prettyDomain(part)}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function toDraft(r: Restaurant): PlaceDraft {
  return {
    name: r.name,
    cuisine: r.cuisine ?? "",
    area: r.area ?? "",
    city: r.city ?? "",
    price_level: r.price_level,
    price_range: r.price_range,
    status: r.status,
    recommended_by: r.recommended_by ?? "",
    notes: r.notes ?? "",
    link: r.link ?? "",
    google_place_id: r.google_place_id,
    google_maps_url: r.google_maps_url,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    photos: r.photos,
    folder_id: r.folder_id,
  };
}

const STATUS_ORDER: RestaurantStatus[] = ["want_to_try", "been", "favorite"];

export function PlaceDetail({
  restaurant,
  isOwner,
  folders,
}: {
  restaurant: Restaurant;
  isOwner: boolean;
  folders: Folder[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlaceDraft>(toDraft(restaurant));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const meta = STATUS_META[restaurant.status];
  const folderName =
    folders.find((f) => f.id === restaurant.folder_id)?.name ?? null;
  const photos = restaurant.photos ?? [];
  const heroUrl = photos[0] ? placePhotoUrl(photos[0], 800) : null;
  const gallery = photos.slice(1, 5);

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
      <main className="max-w-sm mx-auto px-6 pt-6 space-y-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Edit place</h1>
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
          <PlaceFields draft={draft} onChange={setDraft} folders={folders} />
          {error ? (
            <p className="font-body text-sm text-coral text-center">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !draft.name.trim()}
            className="w-full bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto pb-6">
      {/* Hero header image */}
      {heroUrl ? (
        <div className="relative h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          <Link
            href="/"
            className="absolute top-4 left-4 w-9 h-9 rounded-lg bg-ink/80 backdrop-blur border border-line flex items-center justify-center text-snow"
            aria-label="Back to all places"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      ) : null}

      <div className={`px-6 space-y-5 ${heroUrl ? "-mt-6 relative" : "pt-6"}`}>
        {!heroUrl ? (
          <Link href="/" className="font-body text-sm text-fog inline-block">
            ← All places
          </Link>
        ) : null}

        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[28px] font-semibold text-white leading-tight tracking-[-0.01em]">
              {restaurant.name}
            </h1>
            <button
              onClick={cycleStatus}
              disabled={busy}
              title="Tap to change status"
              className="shrink-0 rounded-full px-3 py-1.5 font-body text-xs font-semibold disabled:opacity-60"
              style={{ backgroundColor: meta.pin, color: "#1F1D2B" }}
            >
              {meta.emoji} {meta.label}
            </button>
          </div>
          <p className="font-body text-sm text-fog">
            {[
              restaurant.cuisine,
              restaurant.area ?? restaurant.city,
              restaurant.price_range ?? priceLabel(restaurant.price_level),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {restaurant.address ? (
            <p className="font-body text-xs text-fog/80">
              📍 {restaurant.address}
            </p>
          ) : null}
          {!isOwner && folderName ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-lilac/20 text-lilac px-2 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.06em]">
              📁 {folderName}
            </span>
          ) : null}
        </header>

        {isOwner ? (
          <FolderPicker
            restaurantId={restaurant.id}
            currentFolderId={restaurant.folder_id}
            folders={folders}
          />
        ) : null}

        {restaurant.recommended_by ? (
          <p className="font-body text-sm text-mist break-words">
            Recommended by {withLinks(restaurant.recommended_by)}
          </p>
        ) : null}

        {restaurant.notes ? (
          <div className="rounded-xl bg-card border border-line p-4">
            <p className="font-body text-sm text-snow whitespace-pre-wrap leading-relaxed">
              {restaurant.notes}
            </p>
          </div>
        ) : null}

        {/* Photo gallery */}
        {gallery.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {gallery.map((p) => {
              const url = placePhotoUrl(p, 400);
              if (!url) return null;
              return (
                <button
                  key={p}
                  onClick={() => setLightbox(placePhotoUrl(p, 1200))}
                  className="aspect-square rounded-lg overflow-hidden border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Backfill photos for entries saved before this feature */}
        {photos.length === 0 && restaurant.google_place_id ? (
          <FetchPhotosButton
            id={restaurant.id}
            placeId={restaurant.google_place_id}
          />
        ) : null}

        <div className="space-y-2">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90"
            >
              Open in Google Maps →
            </a>
          ) : null}
          {restaurant.link ? (
            <a
              href={restaurant.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-card border border-line text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
            >
              Visit link →
            </a>
          ) : null}
        </div>

        {isOwner ? (
          <div className="pt-2 space-y-2">
            <button
              onClick={() => setEditing(true)}
              className="w-full bg-card border border-line text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
            >
              Edit details
            </button>
            {confirmDelete ? (
              <div className="flex gap-2">
                <button
                  onClick={() => deleteRestaurant(restaurant.id)}
                  className="flex-1 bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 bg-card border border-line text-snow rounded-lg py-3 font-body"
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
      </div>

      {/* Lightbox */}
      {lightbox ? (
        <button
          className="fixed inset-0 z-50 bg-night/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          aria-label="Close photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full rounded-xl"
          />
        </button>
      ) : null}
    </main>
  );
}
