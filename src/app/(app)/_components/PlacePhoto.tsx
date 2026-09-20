"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { refreshPlacePhotos } from "../actions";
import { placePhotoUrl } from "@/lib/types";

/** One refresh per restaurant per page load, shared across every
 *  <PlacePhoto> for that restaurant (hero + gallery + tiles). */
const inflight = new Map<string, Promise<string[] | null>>();

function refreshOnce(restaurantId: string): Promise<string[] | null> {
  let p = inflight.get(restaurantId);
  if (!p) {
    p = refreshPlacePhotos(restaurantId)
      .then((r) => (r.success && r.photos?.length ? r.photos : null))
      .catch(() => null);
    inflight.set(restaurantId, p);
  }
  return p;
}

/**
 * Google Places photo that heals itself. Stored photo resource names can
 * stop resolving (Google rotates them), which used to leave every header
 * image blank. When the image fails to load we refetch the place's photos
 * from Google once, save them, and swap in the fresh one.
 *
 * Renders `fallback` (or nothing) when there is no usable photo.
 */
export function PlacePhoto({
  restaurantId,
  photoName,
  index = 0,
  width,
  alt = "",
  className,
  fallback = null,
}: {
  restaurantId: string;
  photoName: string | null | undefined;
  /** Which photo this slot shows, so a refresh swaps in the same slot. */
  index?: number;
  width: number;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const router = useRouter();
  // `fresh` overrides the stored name once a refresh succeeds.
  const [fresh, setFresh] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [tried, setTried] = useState(false);
  // Reset when the server hands us a different stored name (e.g. after
  // router.refresh()) — derived-state reset during render, per React docs.
  const [seen, setSeen] = useState(photoName);
  if (seen !== photoName) {
    setSeen(photoName);
    setFresh(null);
    setFailed(false);
    setTried(false);
  }

  const name = fresh ?? photoName ?? null;
  const src = name ? placePhotoUrl(name, width) : null;
  if (!src || failed) return <>{fallback}</>;

  async function onError() {
    if (tried) {
      setFailed(true);
      return;
    }
    setTried(true);
    const fresh = await refreshOnce(restaurantId);
    const next = fresh?.[index] ?? fresh?.[0] ?? null;
    if (!next || next === name) {
      setFailed(true);
      return;
    }
    setFresh(next);
    // Server data now has the new names; re-render everything else too.
    router.refresh();
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={onError} />
  );
}
