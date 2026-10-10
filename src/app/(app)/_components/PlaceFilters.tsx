"use client";

import { useMemo, useState } from "react";
import { openStatus } from "@/lib/hours";
import {
  priceLevelOf,
  type Folder,
  type Project,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

/**
 * One set of place filters shared by the Home list and the Map, so the
 * two screens always offer exactly the same controls.
 */

export type StatusFilter = "all" | RestaurantStatus;
export type LatLng = { lat: number; lng: number };

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const RADIUS_OPTIONS = [1, 3, 5, 10];

export function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "h-8 rounded-lg bg-coral text-ink px-3 text-[13px] font-semibold whitespace-nowrap"
          : "h-8 rounded-lg bg-card border border-line text-mist px-3 text-[13px] font-medium whitespace-nowrap"
      }
    >
      {label}
    </button>
  );
}

export function usePlaceFilters({
  restaurants,
  folders,
  projects,
  membership,
}: {
  restaurants: Restaurant[];
  folders: Folder[];
  projects: Project[];
  /** restaurant id → project ids */
  membership: Record<string, string[]>;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [folderId, setFolderId] = useState<string | null | "none">(null);
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: restaurants.length,
      want_to_try: 0,
      been: 0,
      favorite: 0,
    };
    for (const r of restaurants) c[r.status]++;
    return c;
  }, [restaurants]);

  const statusOptions: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: `All ${counts.all}` },
    { key: "want_to_try", label: `Want to try ${counts.want_to_try}` },
    { key: "been", label: `Been ${counts.been}` },
    { key: "favorite", label: `Favourites ${counts.favorite}` },
  ];

  // Cascading location options: countries → cities (in country) → areas
  // (in city).
  const countries = useMemo(() => {
    const s = new Set<string>();
    for (const r of restaurants) if (r.country) s.add(r.country);
    return Array.from(s).sort();
  }, [restaurants]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    for (const r of restaurants) {
      if (countryFilter && r.country !== countryFilter) continue;
      if (r.city) s.add(r.city);
    }
    return Array.from(s).sort();
  }, [restaurants, countryFilter]);

  const areas = useMemo(() => {
    const s = new Set<string>();
    for (const r of restaurants) {
      if (countryFilter && r.country !== countryFilter) continue;
      if (cityFilter && r.city !== cityFilter) continue;
      if (r.area) s.add(r.area);
    }
    return Array.from(s).sort();
  }, [restaurants, countryFilter, cityFilter]);

  const folderCount = (id: string) =>
    restaurants.filter((r) => r.folder_id === id).length;
  const projectCount = (id: string) =>
    restaurants.filter((r) => (membership[r.id] ?? []).includes(id)).length;

  /** Does a place pass every active filter? (Search text is the caller's.) */
  const matches = useMemo(() => {
    return (r: Restaurant): boolean => {
      if (projectFilter && !(membership[r.id] ?? []).includes(projectFilter))
        return false;
      if (status !== "all" && r.status !== status) return false;
      if (folderId === "none" && r.folder_id !== null) return false;
      if (folderId !== null && folderId !== "none" && r.folder_id !== folderId)
        return false;
      if (priceFilter !== null && priceLevelOf(r) !== priceFilter) return false;
      if (countryFilter && r.country !== countryFilter) return false;
      if (cityFilter && r.city !== cityFilter) return false;
      if (areaFilter && r.area !== areaFilter) return false;
      if (radiusKm && userLoc) {
        if (r.lat == null || r.lng == null) return false;
        if (haversineKm(userLoc, { lat: r.lat, lng: r.lng }) > radiusKm)
          return false;
      }
      if (openNow) {
        const st = openStatus(r.opening_hours, r.utc_offset_minutes);
        if (!st?.isOpen) return false;
      }
      return true;
    };
  }, [
    projectFilter,
    membership,
    status,
    folderId,
    priceFilter,
    countryFilter,
    cityFilter,
    areaFilter,
    radiusKm,
    userLoc,
    openNow,
  ]);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (folderId !== null ? 1 : 0) +
    (priceFilter !== null ? 1 : 0) +
    (countryFilter || cityFilter || areaFilter ? 1 : 0) +
    (radiusKm !== null ? 1 : 0) +
    (openNow ? 1 : 0) +
    (projectFilter ? 1 : 0);

  function clearFilters() {
    setOpenNow(false);
    setProjectFilter(null);
    setStatus("all");
    setFolderId(null);
    setPriceFilter(null);
    setCountryFilter(null);
    setCityFilter(null);
    setAreaFilter(null);
    setRadiusKm(null);
  }

  function requestRadius(km: number) {
    if (radiusKm === km) {
      setRadiusKm(null);
      return;
    }
    setGeoError(null);
    if (userLoc) {
      setRadiusKm(km);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRadiusKm(km);
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get your location — allow location access.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return {
    status,
    setStatus,
    folderId,
    setFolderId,
    priceFilter,
    setPriceFilter,
    countryFilter,
    setCountryFilter,
    cityFilter,
    setCityFilter,
    areaFilter,
    setAreaFilter,
    radiusKm,
    openNow,
    setOpenNow,
    projectFilter,
    setProjectFilter,
    userLoc,
    locating,
    geoError,
    open,
    setOpen,
    counts,
    statusOptions,
    countries,
    cities,
    areas,
    folders,
    projects,
    folderCount,
    projectCount,
    matches,
    activeFilterCount,
    clearFilters,
    requestRadius,
  };
}

export type PlaceFilters = ReturnType<typeof usePlaceFilters>;

/** The "Filters (n)" button that opens the sheet. */
export function FiltersButton({
  filters: f,
  onMap = false,
}: {
  filters: PlaceFilters;
  /** Slightly more opaque idle style for sitting over the map. */
  onMap?: boolean;
}) {
  const idle = onMap
    ? "h-8 rounded-lg bg-card/90 border border-line text-mist px-3 text-[13px] font-medium flex items-center gap-1.5 backdrop-blur"
    : "h-8 rounded-lg border border-line text-mist px-3 text-[13px] font-medium flex items-center gap-1.5";
  return (
    <button
      onClick={() => f.setOpen(true)}
      className={
        f.activeFilterCount > 0
          ? "h-8 rounded-lg bg-coral text-ink px-3 text-[13px] font-semibold flex items-center gap-1.5"
          : idle
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      Filters{f.activeFilterCount > 0 ? ` (${f.activeFilterCount})` : ""}
    </button>
  );
}

/** The bottom sheet with every filter section. */
export function FiltersSheet({
  filters: f,
  resultCount,
}: {
  filters: PlaceFilters;
  resultCount: number;
}) {
  if (!f.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/70"
      onClick={() => f.setOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-ink border-t border-line rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-white">Filters</p>
          {f.activeFilterCount > 0 ? (
            <button onClick={f.clearFilters} className="text-[13px] text-coral">
              Clear all
            </button>
          ) : null}
        </div>

        {/* Project */}
        {f.projects.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-fog tracking-wide uppercase">Project</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={f.projectFilter === null}
                onClick={() => f.setProjectFilter(null)}
                label="All places"
              />
              {f.projects.map((p) => (
                <FilterChip
                  key={p.id}
                  active={f.projectFilter === p.id}
                  onClick={() =>
                    f.setProjectFilter(f.projectFilter === p.id ? null : p.id)
                  }
                  label={`${p.name} ${f.projectCount(p.id)}`}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Tag */}
        {f.folders.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-fog tracking-wide uppercase">Tag</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={f.folderId === null}
                onClick={() => f.setFolderId(null)}
                label="All places"
              />
              {f.folders.map((fo) => (
                <FilterChip
                  key={fo.id}
                  active={f.folderId === fo.id}
                  onClick={() => f.setFolderId(f.folderId === fo.id ? null : fo.id)}
                  label={`${fo.name} ${f.folderCount(fo.id)}`}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Status */}
        <div className="space-y-1.5">
          <p className="text-xs text-fog tracking-wide uppercase">Status</p>
          <div className="flex flex-wrap gap-2">
            {f.statusOptions.map((s) => (
              <FilterChip
                key={s.key}
                active={f.status === s.key}
                onClick={() => f.setStatus(s.key)}
                label={s.label}
              />
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <p className="text-xs text-fog tracking-wide uppercase">Price</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((p) => (
              <FilterChip
                key={p}
                active={f.priceFilter === p}
                onClick={() => f.setPriceFilter(f.priceFilter === p ? null : p)}
                label={"$".repeat(p)}
              />
            ))}
          </div>
        </div>

        {/* Country */}
        {f.countries.length > 1 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-fog tracking-wide uppercase">Country</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={f.countryFilter === null}
                onClick={() => {
                  f.setCountryFilter(null);
                  f.setCityFilter(null);
                  f.setAreaFilter(null);
                }}
                label="All countries"
              />
              {f.countries.map((c) => (
                <FilterChip
                  key={c}
                  active={f.countryFilter === c}
                  onClick={() => {
                    f.setCountryFilter(c);
                    f.setCityFilter(null);
                    f.setAreaFilter(null);
                  }}
                  label={c}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* City */}
        {f.cities.length > 1 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-fog tracking-wide uppercase">City</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={f.cityFilter === null}
                onClick={() => {
                  f.setCityFilter(null);
                  f.setAreaFilter(null);
                }}
                label="All cities"
              />
              {f.cities.map((c) => (
                <FilterChip
                  key={c}
                  active={f.cityFilter === c}
                  onClick={() => {
                    f.setCityFilter(f.cityFilter === c ? null : c);
                    f.setAreaFilter(null);
                  }}
                  label={c}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Area — only once a city narrows it down */}
        {f.cityFilter && f.areas.length > 1 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-fog tracking-wide uppercase">Area</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={f.areaFilter === null}
                onClick={() => f.setAreaFilter(null)}
                label="All areas"
              />
              {f.areas.map((a) => (
                <FilterChip
                  key={a}
                  active={f.areaFilter === a}
                  onClick={() => f.setAreaFilter(f.areaFilter === a ? null : a)}
                  label={a}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Open now */}
        <div className="space-y-1.5">
          <p className="text-xs text-fog tracking-wide uppercase">Right now</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={f.openNow}
              onClick={() => f.setOpenNow(!f.openNow)}
              label="Open now"
            />
          </div>
          {f.openNow ? (
            <p className="text-xs text-fog">
              Hides places whose hours Google doesn&apos;t list.
            </p>
          ) : null}
        </div>

        {/* Near me */}
        <div className="space-y-1.5">
          <p className="text-xs text-fog tracking-wide uppercase">Near me</p>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((km) => (
              <FilterChip
                key={km}
                active={f.radiusKm === km}
                onClick={() => f.requestRadius(km)}
                label={`${km} km`}
              />
            ))}
          </div>
          {f.locating ? <p className="text-xs text-fog">Getting your location…</p> : null}
          {f.geoError ? <p className="text-xs text-coral">{f.geoError}</p> : null}
        </div>

        <button
          onClick={() => f.setOpen(false)}
          className="w-full rounded-lg bg-coral text-ink py-3 text-sm font-semibold"
        >
          Show {resultCount} place{resultCount === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
