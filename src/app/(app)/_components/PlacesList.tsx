"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  STATUS_META,
  priceLabel,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

type Filter = "all" | RestaurantStatus;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "want_to_try", label: "Want to try" },
  { key: "been", label: "Been" },
  { key: "favorite", label: "Favourites" },
];

export function PlacesList({
  restaurants,
  names,
}: {
  restaurants: Restaurant[];
  names: Record<string, string>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.name, r.cuisine, r.area, r.city, r.recommended_by, r.notes]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q));
    });
  }, [restaurants, filter, query]);

  if (restaurants.length === 0) {
    return (
      <div className="rounded-3xl bg-white/70 p-8 text-center space-y-2 mt-4">
        <p className="font-display text-lg text-basil">
          Save your first recommendation
        </p>
        <p className="font-display italic text-sm text-basil/60">
          Next time someone says &ldquo;you have to try this place&rdquo; —
          tap Add before you forget.
        </p>
        <Link
          href="/add"
          className="inline-block mt-2 bg-tomato text-white rounded-full px-6 py-3 font-body font-medium hover:opacity-90"
        >
          Add a place →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, cuisine, area, who…"
        className="w-full rounded-2xl bg-white/70 px-4 py-3 font-body text-sm text-basil placeholder:text-basil/40 focus:outline-none focus:bg-white"
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "shrink-0 rounded-full bg-basil text-cream px-4 py-1.5 font-body text-xs font-medium"
                : "shrink-0 rounded-full bg-white/70 text-basil/70 px-4 py-1.5 font-body text-xs"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((r) => {
          const meta = STATUS_META[r.status];
          const who = r.recommended_by
            ? r.recommended_by
            : r.created_by
              ? names[r.created_by]
              : null;
          return (
            <li key={r.id}>
              <Link
                href={`/place/${r.id}`}
                className="block rounded-3xl bg-white/70 p-4 hover:bg-white transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg text-basil leading-snug">
                      {r.name}
                    </p>
                    <p className="font-body text-xs text-basil/60 pt-0.5">
                      {[r.cuisine, r.area ?? r.city, priceLabel(r.price_level)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {who ? (
                      <p className="font-display italic text-xs text-basil/50 pt-1">
                        via {who}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-medium text-white"
                    style={{ backgroundColor: meta.pin }}
                  >
                    {meta.emoji} {meta.label}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="rounded-3xl bg-white/50 p-6 text-center font-display italic text-sm text-basil/60">
            Nothing matches — try a different filter.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
