"use client";

import { useState } from "react";
import Link from "next/link";
import { savePlaceToMyList } from "../../../(app)/actions";
import {
  STATUS_META,
  placePhotoUrl,
  priceLabel,
  type Restaurant,
} from "@/lib/types";

export function SharedPlace({
  place,
  isLoggedIn,
}: {
  place: Restaurant;
  isLoggedIn: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = STATUS_META[place.status];
  const photos = place.photos ?? [];
  const heroUrl = photos[0] ? placePhotoUrl(photos[0], 800) : null;
  const gallery = photos.slice(1, 5);
  const mapsUrl =
    place.google_maps_url ??
    (place.lat != null && place.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : place.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address}`)}`
        : null);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await savePlaceToMyList(place.id);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't save.");
      return;
    }
    setSaved(true);
  }

  return (
    <main className="max-w-sm mx-auto pb-10">
      {heroUrl ? (
        <div className="relative h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroUrl} alt={place.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        </div>
      ) : null}

      <div className={`px-6 space-y-5 ${heroUrl ? "-mt-6 relative" : "pt-8"}`}>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mark.svg" alt="" className="h-6 w-auto" />
          <span className="font-body text-sm text-fog">
            Shared from GreatFinds
          </span>
        </div>

        <header className="space-y-2">
          <h1 className="text-[28px] font-semibold text-white leading-tight tracking-[-0.01em]">
            {place.name}
          </h1>
          <p className="font-body text-sm text-fog">
            {[
              place.cuisine,
              place.area ?? place.city,
              place.price_range ?? priceLabel(place.price_level),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {place.address ? (
            <p className="font-body text-xs text-fog/80">📍 {place.address}</p>
          ) : null}
        </header>

        {place.notes ? (
          <div className="rounded-xl bg-card border border-line p-4">
            <p className="font-body text-sm text-snow whitespace-pre-wrap leading-relaxed">
              {place.notes}
            </p>
          </div>
        ) : null}

        {gallery.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {gallery.map((p) => {
              const url = placePhotoUrl(p, 400);
              if (!url) return null;
              return (
                <div key={p} className="aspect-square rounded-lg overflow-hidden border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="space-y-2">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-card border border-line text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
              style={{ borderColor: meta.pin }}
            >
              Open in Google Maps →
            </a>
          ) : null}

          {isLoggedIn ? (
            saved ? (
              <Link
                href="/"
                className="block w-full text-center bg-coral text-ink rounded-lg py-3 font-body font-semibold"
              >
                Saved ✓ — view in your list
              </Link>
            ) : (
              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save to my GreatFinds"}
              </button>
            )
          ) : (
            <div className="space-y-2">
              <Link
                href="/request-access"
                className="block w-full text-center bg-coral text-ink rounded-lg py-3 font-body font-semibold"
              >
                Request access to save this
              </Link>
              <Link
                href="/login"
                className="block w-full text-center font-body text-sm text-fog hover:text-snow"
              >
                Already have an account? Log in
              </Link>
            </div>
          )}
          {error ? (
            <p className="font-body text-sm text-coral text-center">{error}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
