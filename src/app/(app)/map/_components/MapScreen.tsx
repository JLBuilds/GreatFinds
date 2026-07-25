"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  APIProvider,
  AdvancedMarker,
  Map,
} from "@vis.gl/react-google-maps";
import {
  STATUS_META,
  initials,
  priceLabel,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

type Filter = "all" | RestaurantStatus;

// Dubai — sensible default center when the list is empty.
const FALLBACK_CENTER = { lat: 25.2048, lng: 55.2708 };

export function MapScreen({ restaurants }: { restaurants: Restaurant[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

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
    { key: "want_to_try", label: `Try ${counts.want_to_try}` },
    { key: "been", label: `Been ${counts.been}` },
    { key: "favorite", label: `Fave ${counts.favorite}` },
  ];

  const visible = useMemo(
    () => restaurants.filter((r) => filter === "all" || r.status === filter),
    [restaurants, filter],
  );

  const center = useMemo(() => {
    if (visible.length === 0) return FALLBACK_CENTER;
    const lat =
      visible.reduce((sum, r) => sum + (r.lat as number), 0) / visible.length;
    const lng =
      visible.reduce((sum, r) => sum + (r.lng as number), 0) / visible.length;
    return { lat, lng };
  }, [visible]);

  if (!apiKey) {
    return (
      <main className="max-w-sm mx-auto px-6 pt-10 text-center space-y-2">
        <p className="text-[17px] font-semibold text-white">
          Map isn&apos;t set up yet
        </p>
        <p className="text-sm text-fog">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to the environment and redeploy.
        </p>
      </main>
    );
  }

  const open = visible.find((r) => r.id === openId) ?? null;
  const openMeta = open ? STATUS_META[open.status] : null;
  const openWho = open
    ? (open.recommended_by ?? null)
    : null;

  return (
    <main className="fixed inset-0 bottom-[84px]">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={visible.length > 0 ? 12 : 10}
          mapId="GREATFIND_MAP"
          colorScheme="DARK"
          disableDefaultUI
          gestureHandling="greedy"
          className="w-full h-full"
          onClick={() => setOpenId(null)}
        >
          {visible.map((r) => {
            const meta = STATUS_META[r.status];
            const selected = r.id === openId;
            return (
              <AdvancedMarker
                key={r.id}
                position={{ lat: r.lat as number, lng: r.lng as number }}
                onClick={() => setOpenId(r.id)}
                zIndex={selected ? 500 : undefined}
              >
                {/* Kept-style pin: dark disc, coloured ring, initial */}
                <div
                  style={{
                    width: selected ? 42 : 34,
                    height: selected ? 42 : 34,
                    borderRadius: 999,
                    background: selected ? meta.pin : "#1F1D2B",
                    border: `2px solid ${selected ? "#1F1D2B" : meta.pin}`,
                    color: selected ? "#1F1D2B" : meta.pin,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: selected ? 16 : 13,
                    fontWeight: 600,
                    boxShadow: selected
                      ? `0 8px 20px ${meta.pin}66`
                      : "0 6px 16px rgba(0,0,0,0.55)",
                  }}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>

      {/* Top gradient + chrome, per map-explore.html */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[106px] bg-gradient-to-b from-ink/95 via-ink/75 to-transparent" />

      <div className="absolute top-4 left-0 right-0 max-w-sm mx-auto px-6 flex flex-col gap-3">
        <div className="h-[46px] rounded-lg bg-card/95 border border-line backdrop-blur flex items-center gap-2.5 px-3.5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
            <circle cx="7.6" cy="7.6" r="6.1" stroke="#889898" strokeWidth="1.5" />
            <path d="M12.2 12.2 16.2 16.2" stroke="#889898" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[15px] font-medium text-snow">Your map</span>
          <span className="text-[15px] text-fog">
            · {counts.all} kept
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-6 px-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setOpenId(null);
              }}
              className={
                filter === f.key
                  ? "shrink-0 h-8 rounded-lg bg-coral text-ink px-3 text-[13px] font-semibold flex items-center whitespace-nowrap"
                  : "shrink-0 h-8 rounded-lg bg-card/90 border border-line text-mist px-3 text-[13px] font-medium flex items-center whitespace-nowrap"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected place sheet, per the design */}
      {open && openMeta ? (
        <div className="absolute left-4 right-4 bottom-4 max-w-sm mx-auto rounded-xl bg-ink border border-line p-4 shadow-[0_18px_44px_rgba(0,0,0,0.55)] flex gap-3.5 items-center">
          <div
            className="w-[64px] h-[64px] rounded-lg flex items-center justify-center text-2xl font-semibold shrink-0"
            style={{ backgroundColor: `${openMeta.pin}22`, color: openMeta.pin }}
          >
            {open.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex flex-col gap-[3px] min-w-0">
            <span className="text-[17px] font-semibold text-white truncate">
              {open.name}
            </span>
            <span className="text-[13px] text-fog truncate">
              {[
                open.area ?? open.city,
                open.cuisine,
                priceLabel(open.price_level),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {openWho || open.notes ? (
              <span className="flex items-center gap-1.5 mt-0.5 min-w-0">
                {openWho ? (
                  <span
                    className="w-[18px] h-[18px] rounded-full text-[9px] font-semibold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: openMeta.pin, color: "#1F1D2B" }}
                  >
                    {initials(openWho)}
                  </span>
                ) : null}
                <span className="text-[13px] font-medium text-mist truncate">
                  {open.notes ?? `via ${openWho}`}
                </span>
              </span>
            ) : null}
          </div>
          <Link
            href={`/place/${open.id}`}
            aria-label="Open details"
            className="w-[38px] h-[38px] rounded-lg bg-card border border-line flex items-center justify-center shrink-0 text-coral"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      ) : null}
    </main>
  );
}
