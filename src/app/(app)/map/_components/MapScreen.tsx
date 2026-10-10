"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlacePhoto } from "../../_components/PlacePhoto";
import { FiltersButton, FiltersSheet, usePlaceFilters } from "../../_components/PlaceFilters";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  STATUS_META,
  extractUrl,
  initials,
  prettyDomain,
  isHiddenClosed,
  priceLabel,
  type Folder,
  type Project,
  type Restaurant,
} from "@/lib/types";

// Dubai — sensible default center when the list is empty.
const FALLBACK_CENTER = { lat: 25.2048, lng: 55.2708 };

/** Pans/zooms the map to frame `places` whenever `fitKey` changes. Lives
 *  inside <Map> so it can reach the map instance. */
function FitToPlaces({
  places,
  fitKey,
}: {
  places: Restaurant[];
  fitKey: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const pts = places.filter((r) => r.lat != null && r.lng != null);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.panTo({ lat: pts[0].lat as number, lng: pts[0].lng as number });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const r of pts) {
      bounds.extend({ lat: r.lat as number, lng: r.lng as number });
    }
    // Leave room for the top chrome and the bottom place sheet.
    map.fitBounds(bounds, { top: 130, bottom: 120, left: 40, right: 40 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);
  return null;
}

export function MapScreen({
  restaurants,
  folders = [],
  projects = [],
  membership = {},
}: {
  restaurants: Restaurant[];
  folders?: Folder[];
  projects?: Project[];
  /** restaurant id → project ids */
  membership?: Record<string, string[]>;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [openId, setOpenId] = useState<string | null>(null);

  // Same filters as the Home tab.
  const pf = usePlaceFilters({ restaurants, folders, projects, membership });
  const project = projects.find((p) => p.id === pf.projectFilter) ?? null;

  const { matches } = pf;
  const visible = useMemo(
    () => restaurants.filter((r) => !isHiddenClosed(r) && matches(r)),
    [restaurants, matches],
  );
  // Re-frame the map whenever a project is selected and the visible set
  // changes; with no project, leave the user's view alone.
  const fitKey = pf.projectFilter
    ? `${pf.projectFilter}:${visible.map((r) => r.id).join(",")}`
    : "all";

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
          <FitToPlaces places={visible} fitKey={fitKey} />
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
        <div
          className={
            project
              ? "h-[46px] rounded-lg bg-lilac/20 border border-lilac/50 backdrop-blur flex items-center gap-2.5 px-3.5"
              : "h-[46px] rounded-lg bg-card/95 border border-line backdrop-blur flex items-center gap-2.5 px-3.5"
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
            <path
              d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3.2l1.8 2h6A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
              stroke={project ? "#9288E0" : "#889898"}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          <span className="min-w-0 flex-1 truncate">
            <span className={project ? "text-[15px] font-semibold text-snow" : "text-[15px] font-medium text-snow"}>
              {project ? project.name : "Your map"}
            </span>
            <span className="text-[15px] text-fog">
              {" "}· {visible.length} {project ? "in project" : "on map"}
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <FiltersButton filters={pf} onMap />
        </div>
      </div>

      {/* Selected place sheet, per the design */}
      {open && openMeta ? (
        <div className="absolute left-4 right-4 bottom-4 max-w-sm mx-auto rounded-xl bg-ink border border-line p-4 shadow-[0_18px_44px_rgba(0,0,0,0.55)] flex gap-3.5 items-center">
          <PlacePhoto
            restaurantId={open.id}
            photoName={open.photos?.[0]}
            width={200}
            className="w-[64px] h-[64px] rounded-lg object-cover shrink-0"
            fallback={
              <div
                className="w-[64px] h-[64px] rounded-lg flex items-center justify-center text-2xl font-semibold shrink-0"
                style={{ backgroundColor: `${openMeta.pin}22`, color: openMeta.pin }}
              >
                {open.name.charAt(0).toUpperCase()}
              </div>
            }
          />
          <div className="flex-1 flex flex-col gap-[3px] min-w-0">
            <span className="text-[17px] font-semibold text-white truncate">
              {open.name}
            </span>
            <span className="text-[13px] text-fog truncate">
              {[
                open.area ?? open.city,
                open.cuisine,
                open.price_range ?? priceLabel(open.price_level),
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
                    {extractUrl(openWho) ? "↗" : initials(openWho)}
                  </span>
                ) : null}
                <span className="text-[13px] font-medium text-mist truncate">
                  {open.notes ??
                    (openWho && extractUrl(openWho)
                      ? `via ${prettyDomain(extractUrl(openWho) as string)}`
                      : `via ${openWho}`)}
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

      <FiltersSheet filters={pf} resultCount={visible.length} />
    </main>
  );
}
