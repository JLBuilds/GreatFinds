"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncPlaceDetails } from "../actions";

/** Ids attempted this session, so a failed sync (e.g. migration not yet
 *  applied) never turns into a refresh loop. */
const attempted = new Set<string>();

/** Refresh hours/amenities for stale places, a few at a time, then
 *  re-render with the new data. Renders nothing. */
export function PlaceSync({ ids }: { ids: string[] }) {
  const router = useRouter();
  const key = ids.join(",");
  useEffect(() => {
    const todo = key.split(",").filter((id) => id && !attempted.has(id));
    if (todo.length === 0) return;
    let cancelled = false;
    (async () => {
      let changed = false;
      for (const id of todo) {
        attempted.add(id);
        const r = await syncPlaceDetails(id);
        if (r.success) changed = true;
        if (cancelled) return;
      }
      if (changed) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [key, router]);
  return null;
}
