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
import { LinkToGoogle } from "./LinkToGoogle";
import { HoursAndAmenities } from "./HoursAndAmenities";
import { MeetHere, directionsUrl } from "./MeetHere";
import { PlacePhoto } from "../../../_components/PlacePhoto";
import { FolderPicker } from "./FolderPicker";
import { LinkedText } from "@/components/LinkedText";
import {
  STATUS_META,
  placePhotoUrl,
  priceLabel,
  type Folder,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

function toDraft(r: Restaurant): PlaceDraft {
  return {
    type: r.type ?? "restaurant",
    name: r.name,
    cuisine: r.cuisine ?? "",
    area: r.area ?? "",
    city: r.city ?? "",
    country: r.country ?? "",
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
  const [shareNote, setShareNote] = useState<string | null>(null);

  async function share() {
    const url = `${window.location.origin}/s/${restaurant.id}`;
    const text = `${restaurant.name} — on GreatFinds`;
    // Native share sheet (WhatsApp, Messages, etc.) on mobile; clipboard
    // fallback on desktop or if the user's browser lacks it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ title: restaurant.name, text, url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
      setTimeout(() => setShareNote(null), 2000);
    } catch {
      setShareNote(url);
    }
  }

  const meta = STATUS_META[restaurant.status];
  const folderName =
    folders.find((f) => f.id === restaurant.folder_id)?.name ?? null;
  const photos = restaurant.photos ?? [];
  const heroUrl = photos[0] ? placePhotoUrl(photos[0], 800) : null;
  const gallery = photos.slice(1, 5);

  const dirUrl = directionsUrl(restaurant);
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
      <main className="max-w-sm mx-auto px-6 space-y-5">
        {/* Always-visible actions, so Save is reachable without scrolling */}
        <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-ink/95 backdrop-blur border-b border-line flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setConfirmDelete(false);
              setDraft(toDraft(restaurant));
            }}
            className="font-body text-sm text-fog"
          >
            Cancel
          </button>
          <span className="text-sm font-semibold text-white">Edit place</span>
          <button
            type="submit"
            form="edit-place-form"
            disabled={busy || !draft.name.trim()}
            className="rounded-lg bg-coral text-ink px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>

        <form
          id="edit-place-form"
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

        <div className="pt-4 border-t border-line">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="font-body text-sm text-mist text-center">
                Delete “{restaurant.name}”? This can’t be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => deleteRestaurant(restaurant.id)}
                  className="flex-1 bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 bg-card border border-line text-snow rounded-lg py-3 font-body"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full font-body text-sm text-coral/90 py-2"
            >
              Delete this place
            </button>
          )}
        </div>
      </main>
    );
  }

  const editButton = isOwner ? (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Edit details"
      className="w-9 h-9 rounded-lg bg-ink/80 backdrop-blur border border-line flex items-center justify-center text-snow"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M13.5 8.5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </button>
  ) : null;

  return (
    <main className="max-w-sm mx-auto pb-6">
      {/* Hero header image */}
      {heroUrl ? (
        <div className="relative h-52">
          <PlacePhoto
            restaurantId={restaurant.id}
            photoName={photos[0]}
            width={800}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            fallback={<div className="w-full h-full bg-card" />}
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
          <div className="absolute top-4 right-4">{editButton}</div>
        </div>
      ) : null}

      <div className={`px-6 space-y-5 ${heroUrl ? "-mt-6 relative" : "pt-6"}`}>
        {!heroUrl ? (
          <div className="flex items-center justify-between">
            <Link href="/" className="font-body text-sm text-fog inline-block">
              ← All places
            </Link>
            {editButton}
          </div>
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
          <HoursAndAmenities place={restaurant} />
          {!isOwner && folderName ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-lilac/20 text-lilac px-2 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.06em]">
              🏷️ {folderName}
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
            Recommended by <LinkedText text={restaurant.recommended_by} />
          </p>
        ) : null}

        {restaurant.notes ? (
          <div className="rounded-xl bg-card border border-line p-4">
            <p className="font-body text-sm text-snow whitespace-pre-wrap leading-relaxed break-words">
              <LinkedText text={restaurant.notes} />
            </p>
          </div>
        ) : null}

        {/* Photo gallery */}
        {gallery.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {gallery.map((p, i) => (
              <button
                key={p}
                onClick={() => setLightbox(placePhotoUrl(p, 1200))}
                className="aspect-square rounded-lg overflow-hidden border border-line"
              >
                <PlacePhoto
                  restaurantId={restaurant.id}
                  photoName={p}
                  index={i + 1}
                  width={400}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}

        {/* Backfill photos for entries saved before this feature */}
        {photos.length === 0 && restaurant.google_place_id ? (
          <FetchPhotosButton
            id={restaurant.id}
            placeId={restaurant.google_place_id}
          />
        ) : null}

        {/* Entries added by hand: attach the Google listing */}
        {!restaurant.google_place_id ? (
          <LinkToGoogle restaurant={restaurant} />
        ) : null}

        <div className="space-y-2">
          {dirUrl ? (
            <a
              href={dirUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2.5 21.5 12 12 21.5 2.5 12 12 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 13.5v-2a1 1 0 0 1 1-1h4.5M13 8.5l2.5 2-2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Directions
            </a>
          ) : null}
          <MeetHere place={restaurant} />
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-card border border-line text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
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
          <button
            onClick={share}
            className="w-full flex items-center justify-center gap-2 bg-card border border-line text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M8.7 13.5l6.6 3.8M15.3 6.7L8.7 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="18" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="6" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="18" cy="19" r="2.6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {shareNote ?? "Share"}
          </button>
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
