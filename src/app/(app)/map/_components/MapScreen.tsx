"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
} from "@vis.gl/react-google-maps";
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

// Dubai — sensible default center when the list is empty. With pins
// present the map fits itself around them instead.
const FALLBACK_CENTER = { lat: 25.2048, lng: 55.2708 };

export function MapScreen({ restaurants }: { restaurants: Restaurant[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      restaurants.filter((r) => filter === "all" || r.status === filter),
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
      <main className="max-w-sm mx-auto px-4 pt-10 text-center space-y-2">
        <p className="font-display text-lg text-basil">Map isn&apos;t set up yet</p>
        <p className="font-display italic text-sm text-basil/60">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to the environment and redeploy.
        </p>
      </main>
    );
  }

  const open = visible.find((r) => r.id === openId) ?? null;

  return (
    <main className="fixed inset-0 bottom-[72px]">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={visible.length > 0 ? 11 : 10}
          mapId="GREATFIND_MAP"
          disableDefaultUI
          zoomControl
          gestureHandling="greedy"
          className="w-full h-full"
        >
          {visible.map((r) => (
            <AdvancedMarker
              key={r.id}
              position={{ lat: r.lat as number, lng: r.lng as number }}
              onClick={() => setOpenId(r.id)}
            >
              <Pin
                background={STATUS_META[r.status].pin}
                borderColor="#23503A"
                glyphColor="#FBF6EE"
              />
            </AdvancedMarker>
          ))}

          {open ? (
            <InfoWindow
              position={{ lat: open.lat as number, lng: open.lng as number }}
              onCloseClick={() => setOpenId(null)}
              pixelOffset={[0, -36]}
            >
              <div style={{ fontFamily: "Georgia, serif", color: "#23503A" }}>
                <p style={{ margin: 0, fontSize: 16 }}>{open.name}</p>
                <p style={{ margin: "2px 0 8px", fontSize: 12, opacity: 0.7 }}>
                  {[
                    open.cuisine,
                    open.area ?? open.city,
                    priceLabel(open.price_level),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <Link
                  href={`/place/${open.id}`}
                  style={{ color: "#E05E3D", fontSize: 13 }}
                >
                  View details →
                </Link>
              </div>
            </InfoWindow>
          ) : null}
        </Map>
      </APIProvider>

      {/* Filter pills floating over the map */}
      <div className="absolute top-3 left-0 right-0 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setOpenId(null);
            }}
            className={
              filter === f.key
                ? "shrink-0 rounded-full bg-basil text-cream px-4 py-1.5 font-body text-xs font-medium shadow"
                : "shrink-0 rounded-full bg-cream/95 text-basil/80 px-4 py-1.5 font-body text-xs shadow"
            }
          >
            {f.label}
          </button>
        ))}
      </div>
    </main>
  );
}
