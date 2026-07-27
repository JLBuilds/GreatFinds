"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createFolder, setRestaurantFolder } from "../actions";
import { GoogleFallbackSearch } from "./GoogleFallbackSearch";
import {
  LISTING_TYPES,
  STATUS_META,
  extractUrl,
  initials,
  placePhotoUrl,
  prettyDomain,
  priceLabel,
  priceLevelOf,
  type Folder,
  type ListingType,
  type Restaurant,
  type RestaurantStatus,
} from "@/lib/types";

type Filter = "all" | RestaurantStatus;

export function PlacesList({
  restaurants,
  folders,
}: {
  restaurants: Restaurant[];
  folders: Folder[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ListingType>("all");
  const [folderId, setFolderId] = useState<string | null | "none">(null);
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [localFolders, setLocalFolders] = useState<Folder[]>(folders);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  // Home-screen "move to folder" sheet — targets are one tile's place,
  // or the whole multi-select set.
  const [moveTargets, setMoveTargets] = useState<Restaurant[] | null>(null);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveNewOpen, setMoveNewOpen] = useState(false);
  const [moveNewName, setMoveNewName] = useState("");
  // Multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Chosen destination in the move sheet (undefined = nothing picked yet,
  // null = "No folder").
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);

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

  const folderCount = (id: string) =>
    restaurants.filter((r) => r.folder_id === id).length;

  const folderNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of localFolders) m[f.id] = f.name;
    return m;
  }, [localFolders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (typeFilter !== "all" && (r.type ?? "restaurant") !== typeFilter)
        return false;
      if (folderId === "none" && r.folder_id !== null) return false;
      if (folderId !== null && folderId !== "none" && r.folder_id !== folderId)
        return false;
      if (priceFilter !== null && priceLevelOf(r) !== priceFilter) return false;
      if (!q) return true;
      return [r.name, r.cuisine, r.area, r.city, r.recommended_by, r.notes]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q));
    });
  }, [restaurants, filter, typeFilter, folderId, priceFilter, query]);

  const typeCounts = useMemo(() => {
    const c: Record<ListingType, number> = {
      restaurant: 0,
      experience: 0,
      hotel: 0,
    };
    for (const r of restaurants) c[r.type ?? "restaurant"]++;
    return c;
  }, [restaurants]);
  // Only offer the type filter once the list spans more than one type.
  const typesPresent = LISTING_TYPES.filter((t) => typeCounts[t.key] > 0);

  const selectedRestaurants = restaurants.filter((r) => selectedIds.has(r.id));

  async function addFolder() {
    if (!newFolderName.trim()) return;
    setFolderBusy(true);
    setFolderError(null);
    const result = await createFolder(newFolderName);
    setFolderBusy(false);
    if (!result.success || !result.folderId) {
      setFolderError(result.error ?? "Couldn't create folder.");
      return;
    }
    const folder = { id: result.folderId, name: newFolderName.trim() };
    setLocalFolders((f) => [...f, folder]);
    setNewFolderName("");
    setNewFolderOpen(false);
    setFolderId(folder.id);
    router.refresh();
  }

  function closeMove() {
    setMoveTargets(null);
    setMoveNewOpen(false);
    setMoveNewName("");
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function doMove(targets: Restaurant[], folderId: string | null) {
    setMoveBusy(true);
    const results = await Promise.all(
      targets.map((t) => setRestaurantFolder(t.id, folderId)),
    );
    setMoveBusy(false);
    if (results.every((r) => r.success)) {
      closeMove();
      router.refresh();
    }
  }

  async function createAndSelectFolder() {
    if (!moveNewName.trim()) return;
    setMoveBusy(true);
    const created = await createFolder(moveNewName);
    setMoveBusy(false);
    if (!created.success || !created.folderId) return;
    const folder = { id: created.folderId, name: moveNewName.trim() };
    setLocalFolders((f) => [...f, folder]);
    setChosen(folder.id);
    setMoveNewName("");
    setMoveNewOpen(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (filtered.length > 0 && filtered.every((r) => prev.has(r.id))) {
        return new Set();
      }
      return new Set(filtered.map((r) => r.id));
    });
  }

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
    <div className="space-y-4">
      {/* Search + add */}
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

      {/* Type filter — only shown once the list spans >1 type */}
      {typesPresent.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
          <button
            onClick={() => setTypeFilter("all")}
            className={
              typeFilter === "all"
                ? "shrink-0 h-8 rounded-lg bg-coral text-ink px-3 text-[13px] font-semibold whitespace-nowrap"
                : "shrink-0 h-8 rounded-lg bg-card border border-line text-mist px-3 text-[13px] font-medium whitespace-nowrap"
            }
          >
            Everything
          </button>
          {typesPresent.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={
                typeFilter === t.key
                  ? "shrink-0 h-8 rounded-lg bg-coral text-ink px-3 text-[13px] font-semibold whitespace-nowrap"
                  : "shrink-0 h-8 rounded-lg bg-card border border-line text-mist px-3 text-[13px] font-medium whitespace-nowrap"
              }
            >
              {t.emoji} {t.label}s {typeCounts[t.key]}
            </button>
          ))}
        </div>
      ) : null}

      {/* Folder tabs across the top (Groove-style) */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
          <button
            onClick={() => setFolderId(null)}
            className={
              folderId === null
                ? "shrink-0 h-8 rounded-lg bg-lilac text-ink px-3.5 text-[13px] font-semibold flex items-center whitespace-nowrap"
                : "shrink-0 h-8 rounded-lg bg-card border border-line text-mist px-3.5 text-[13px] font-medium flex items-center whitespace-nowrap"
            }
          >
            All places
          </button>
          {localFolders.map((f) => (
            <button
              key={f.id}
              onClick={() => setFolderId(folderId === f.id ? null : f.id)}
              className={
                folderId === f.id
                  ? "shrink-0 h-8 rounded-lg bg-lilac text-ink px-3.5 text-[13px] font-semibold flex items-center whitespace-nowrap"
                  : "shrink-0 h-8 rounded-lg bg-card border border-line text-mist px-3.5 text-[13px] font-medium flex items-center whitespace-nowrap"
              }
            >
              {f.name} {folderCount(f.id)}
            </button>
          ))}
          <button
            onClick={() => setNewFolderOpen((v) => !v)}
            className="shrink-0 h-8 rounded-lg bg-card border border-dashed border-line text-fog px-3.5 text-[13px] flex items-center whitespace-nowrap"
          >
            + New folder
          </button>
        </div>
        {newFolderOpen ? (
          <div className="flex gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 rounded-lg bg-card border border-line px-3 py-2 text-sm text-snow placeholder:text-fog/70 focus:outline-none"
            />
            <button
              onClick={addFolder}
              disabled={folderBusy || !newFolderName.trim()}
              className="rounded-lg bg-coral text-ink px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {folderBusy ? "…" : "Create"}
            </button>
          </div>
        ) : null}
        {folderError ? (
          <p className="text-xs text-coral">{folderError}</p>
        ) : null}
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
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

      {/* Price filter + select toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((p) => (
            <button
              key={p}
              onClick={() => setPriceFilter(priceFilter === p ? null : p)}
              className={
                priceFilter === p
                  ? "h-8 rounded-lg bg-coral text-ink px-3 text-[13px] font-semibold"
                  : "h-8 rounded-lg bg-card border border-line text-mist px-3 text-[13px] font-medium"
              }
            >
              {"$".repeat(p)}
            </button>
          ))}
        </div>
        {selectMode ? (
          <button
            onClick={() => {
              setSelectMode(false);
              setSelectedIds(new Set());
            }}
            className="h-8 rounded-lg border border-line text-mist px-3 text-[13px] font-medium"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className="h-8 rounded-lg border border-coral text-coral px-3 text-[13px] font-semibold flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Select
          </button>
        )}
      </div>

      {/* 2-column tile grid (Groove library style) */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((r) => {
          const meta = STATUS_META[r.status];
          // Attribution shows only who recommended it (no "added by" —
          // the owner adds everything).
          const who = r.recommended_by;
          const thumb =
            r.photos && r.photos[0] ? placePhotoUrl(r.photos[0], 400) : null;
          // Badge shows the folder name when filed, else the status.
          const folderName = r.folder_id
            ? folderNameById[r.folder_id]
            : null;
          const tagLabel = folderName ?? meta.label;
          const tagColor = folderName ? "#9288E0" : meta.pin;
          const selected = selectedIds.has(r.id);
          return (
            <div key={r.id} className="relative">
            <Link
              href={`/place/${r.id}`}
              onClick={(e) => {
                if (selectMode) {
                  e.preventDefault();
                  toggleSelect(r.id);
                }
              }}
              className={
                selected
                  ? "rounded-xl bg-card border-2 border-coral overflow-hidden flex flex-col transition-colors"
                  : "rounded-xl bg-card border border-line overflow-hidden flex flex-col hover:border-coral/60 transition-colors"
              }
            >
              <div className="relative h-24">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-semibold"
                    style={{
                      backgroundColor: `${meta.pin}22`,
                      color: meta.pin,
                    }}
                  >
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className="absolute left-2 top-2 max-w-[calc(100%-16px)] h-5 rounded-md px-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] flex items-center truncate"
                  style={{
                    backgroundColor: "rgba(31,29,43,0.85)",
                    color: tagColor,
                  }}
                >
                  {tagLabel}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3">
                <span className="text-[15px] font-semibold text-white leading-tight line-clamp-2">
                  {r.name}
                </span>
                <span className="text-[12px] text-fog truncate">
                  {[r.cuisine, r.area ?? r.city]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {r.price_range || r.price_level ? (
                  <span className="text-[12px] text-fog">
                    {r.price_range ?? priceLabel(r.price_level)}
                  </span>
                ) : null}
                {who ? (
                  (() => {
                    const url = extractUrl(who);
                    return (
                      <span className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-[18px] h-[18px] rounded-full text-[9px] font-semibold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.pin, color: "#1F1D2B" }}
                        >
                          {url ? "↗" : initials(who)}
                        </span>
                        <span className="text-[12px] font-medium text-mist truncate">
                          {url ? prettyDomain(url) : who}
                        </span>
                      </span>
                    );
                  })()
                ) : null}
              </div>
            </Link>
            {selectMode ? (
              // Selection checkbox (categorising now happens via Select)
              <button
                onClick={() => toggleSelect(r.id)}
                aria-label={selected ? "Deselect" : "Select"}
                className={
                  selected
                    ? "absolute top-2 right-2 w-7 h-7 rounded-full bg-coral text-ink flex items-center justify-center"
                    : "absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/85 border border-line text-mist flex items-center justify-center"
                }
              >
                {selected ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            ) : null}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card/60 border border-line p-6 text-center space-y-3">
          <p className="text-sm text-fog">
            {query.trim()
              ? `Nothing saved matches “${query.trim()}”.`
              : "Nothing here yet — try a different folder or filter."}
          </p>
          {query.trim() ? <GoogleFallbackSearch query={query.trim()} /> : null}
        </div>
      ) : null}

      {/* Spacer so the floating bar doesn't cover the last tiles */}
      {selectMode ? <div className="h-24" /> : null}

      {/* Floating multi-select action bar */}
      {selectMode ? (
        <div className="fixed left-0 right-0 bottom-[84px] z-40 px-4">
          <div className="max-w-sm mx-auto bg-ink border border-line rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-3 flex items-center gap-3">
            <span className="flex-1 text-sm font-medium text-snow">
              {selectedIds.size === 0
                ? "Tap places to select"
                : `${selectedIds.size} selected`}
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-[13px] text-mist"
            >
              {filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))
                ? "Clear"
                : "Select all"}
            </button>
            <button
              disabled={selectedIds.size === 0}
              onClick={() => {
                setMoveNewOpen(false);
                setMoveNewName("");
                setChosen(undefined);
                setMoveTargets(selectedRestaurants);
              }}
              className="rounded-lg bg-coral text-ink px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Move to folder
            </button>
          </div>
        </div>
      ) : null}

      {/* Move-to-folder sheet (single tile or multi-select) */}
      {moveTargets && moveTargets.length > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-night/70"
          onClick={() => setMoveTargets(null)}
        >
          <div
            className="w-full max-w-sm bg-ink border-t border-line rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] font-semibold text-white">
              {moveTargets.length === 1
                ? `Move “${moveTargets[0].name}” to…`
                : `Move ${moveTargets.length} places to…`}
            </p>
            <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto no-scrollbar">
              {[{ id: null as string | null, name: "No folder" }, ...localFolders].map(
                (f) => {
                  const active = chosen === f.id;
                  return (
                    <button
                      key={f.id ?? "none"}
                      onClick={() => setChosen(f.id)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-card/60"
                    >
                      <span
                        className={
                          active
                            ? "w-[18px] h-[18px] rounded-full border-[5px] border-coral shrink-0"
                            : "w-[18px] h-[18px] rounded-full border-2 border-line shrink-0"
                        }
                      />
                      <span
                        className={
                          active
                            ? "text-sm font-semibold text-snow"
                            : "text-sm text-mist"
                        }
                      >
                        {f.name}
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            {moveNewOpen ? (
              <div className="flex gap-2">
                <input
                  value={moveNewName}
                  onChange={(e) => setMoveNewName(e.target.value)}
                  placeholder="Folder name"
                  className="flex-1 rounded-lg bg-card border border-line px-3 py-2 text-sm text-snow placeholder:text-fog/70 focus:outline-none"
                />
                <button
                  onClick={createAndSelectFolder}
                  disabled={moveBusy || !moveNewName.trim()}
                  className="rounded-lg bg-card border border-line text-snow px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {moveBusy ? "…" : "Add"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMoveNewOpen(true)}
                className="w-full rounded-lg bg-card border border-dashed border-line text-fog px-4 py-2.5 text-sm"
              >
                + New folder
              </button>
            )}

            <button
              onClick={() => doMove(moveTargets, chosen ?? null)}
              disabled={moveBusy || chosen === undefined}
              className="w-full rounded-lg bg-coral text-ink py-3 text-sm font-semibold disabled:opacity-40"
            >
              {moveBusy ? "Moving…" : "Move"}
            </button>
            <button
              onClick={() => setMoveTargets(null)}
              className="w-full text-fog text-sm py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
