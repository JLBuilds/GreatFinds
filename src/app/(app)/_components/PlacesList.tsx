"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  STATUS_META,
  initials,
  priceLabel,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

type Filter = "all" | RestaurantStatus;

export function PlacesList({
  restaurants,
  names,
}: {
  restaurants: Restaurant[];
  names: Record<string, string>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: restaurants.length,
      want_to_try: 0,
      been: 0,
      favorite: 0,
    };
    for (const r of restaurants) c[r.status]++;
    return c;
  }, [restaurants]);

  const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: "all", label: `All ${counts.all}` },
    { key: "want_to_try", label: `Want to try ${counts.want_to_try}` },
    { key: "been", label: `Been ${counts.been}` },
    { key: "favorite", label: `Favourites ${counts.favorite}` },
  ];

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
      <div className="rounded-xl bg-card border border-line p-8 text-center space-y-2">
        <p className="text-[17px] font-semibold text-white">
          Keep your first place
        </p>
        <p className="text-sm text-fog">
          Next time someone says &ldquo;you have to try this place&rdquo; —
          add it before you forget.
        </p>
        <Link
          href="/add"
          className="inline-block mt-3 bg-coral text-ink rounded-lg px-6 py-3 text-sm font-semibold shadow-[0_8px_20px_rgba(234,124,105,0.4)]"
        >
          Add a place
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search + add — mirrors the design's paste bar */}
      <div className="flex gap-2.5 items-center">
        <div className="flex-1 h-[52px] rounded-lg bg-card border border-line flex items-center gap-3 px-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
            <circle cx="7.6" cy="7.6" r="6.1" stroke="#889898" strokeWidth="1.5" />
            <path d="M12.2 12.2 16.2 16.2" stroke="#889898" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your places…"
            className="flex-1 bg-transparent text-[15px] text-snow placeholder:text-fog focus:outline-none"
          />
        </div>
        <button
          onClick={() => router.push("/add")}
          aria-label="Add a place"
          className="w-[52px] h-[52px] rounded-lg bg-coral text-ink flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(234,124,105,0.4)]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "shrink-0 h-8 rounded-lg bg-coral text-ink px-3.5 text-[13px] font-semibold flex items-center whitespace-nowrap"
                : "shrink-0 h-8 rounded-lg bg-card border border-line text-mist px-3.5 text-[13px] font-medium flex items-center whitespace-nowrap"
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
                className="flex items-center gap-3.5 rounded-xl bg-card border border-line p-3.5 hover:border-coral/60 transition-colors"
              >
                <div
                  className="w-[54px] h-[54px] rounded-lg flex items-center justify-center text-lg font-semibold shrink-0"
                  style={{ backgroundColor: `${meta.pin}22`, color: meta.pin }}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 flex flex-col gap-[3px] min-w-0">
                  <span className="text-base font-semibold text-white truncate">
                    {r.name}
                  </span>
                  <span className="text-[13px] text-fog truncate">
                    {[r.cuisine, r.area ?? r.city, priceLabel(r.price_level)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {who ? (
                    <span className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-[18px] h-[18px] rounded-full text-[9px] font-semibold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: meta.pin, color: "#1F1D2B" }}
                      >
                        {initials(who)}
                      </span>
                      <span className="text-[13px] font-medium text-mist truncate">
                        {who}
                      </span>
                    </span>
                  ) : null}
                </div>
                <span
                  className="shrink-0 h-6 rounded-md px-2 text-[11px] font-semibold uppercase tracking-[0.06em] flex items-center"
                  style={{ backgroundColor: "rgba(31,29,43,0.85)", color: meta.pin }}
                >
                  {meta.label}
                </span>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="rounded-xl bg-card/60 border border-line p-6 text-center text-sm text-fog">
            Nothing matches — try a different filter.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
