"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createFolder,
  deleteRestaurants,
  dismissClosedFlag,
  setRestaurantFolder,
} from "../actions";
import { GoogleFallbackSearch } from "./GoogleFallbackSearch";
import { NewProjectForm } from "./ProjectPicker";
import { FiltersButton, FiltersSheet, usePlaceFilters } from "./PlaceFilters";
import { addPlacesToProject } from "../projects/actions";
import { PlacePhoto } from "./PlacePhoto";
import {
  STATUS_META,
  extractUrl,
  initials,
  isHiddenClosed,
  prettyDomain,
  projectSubtitle,
  priceLabel,
  type Folder,
  type Project,
  type Restaurant,
} from "@/lib/types";

export function PlacesList({
  restaurants,
  folders,
  projects = [],
  membership = {},
  targetProjectId = null,
}: {
  restaurants: Restaurant[];
  folders: Folder[];
  projects?: Project[];
  /** restaurant id → project ids it belongs to */
  membership?: Record<string, string[]>;
  /** Arrived from a project's "Add places" link: start in select mode and
   *  send selections straight to that project. */
  targetProjectId?: string | null;
}) {
  const router = useRouter();
  // Projects
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [projectChosen, setProjectChosen] = useState<string | null>(targetProjectId);
  const [projectNewOpen, setProjectNewOpen] = useState(false);
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [localFolders, setLocalFolders] = useState<Folder[]>(folders);
  // Home-screen "move to folder" sheet — targets are one tile's place,
  // or the whole multi-select set.
  const [moveTargets, setMoveTargets] = useState<Restaurant[] | null>(null);
  const [moveBusy, setMoveBusy] = useState(false);
  // Multi-select delete confirmation
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Closed-place review
  const [reviewOpen, setReviewOpen] = useState(false);
  const [closedBusyId, setClosedBusyId] = useState<string | null>(null);
  const [moveNewOpen, setMoveNewOpen] = useState(false);
  const [moveNewName, setMoveNewName] = useState("");
  // Multi-select
  const [selectMode, setSelectMode] = useState(Boolean(targetProjectId));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Chosen destination in the move sheet (undefined = nothing picked yet,
  // null = "No folder").
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);

  // Shared with the Map screen, so both offer identical filters.
  const pf = usePlaceFilters({
    restaurants,
    folders: localFolders,
    projects: localProjects,
    membership,
  });

  // Where to centre Google searches: the user's location if we have it,
  // otherwise the middle of their saved places.
  const searchBias = useMemo(() => {
    if (pf.userLoc) return pf.userLoc;
    const pts = restaurants.filter((r) => r.lat != null && r.lng != null);
    if (pts.length === 0) return null;
    return {
      lat: pts.reduce((s, r) => s + (r.lat as number), 0) / pts.length,
      lng: pts.reduce((s, r) => s + (r.lng as number), 0) / pts.length,
    };
  }, [pf.userLoc, restaurants]);

  const folderNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of localFolders) m[f.id] = f.name;
    return m;
  }, [localFolders]);

  // Places Google reports permanently closed, awaiting the user's review.
  const closedForReview = useMemo(
    () => restaurants.filter(isHiddenClosed),
    [restaurants],
  );

  async function keepClosed(id: string) {
    setClosedBusyId(id);
    await dismissClosedFlag(id);
    setClosedBusyId(null);
    router.refresh();
  }

  async function removeClosed(id: string) {
    setClosedBusyId(id);
    const r = await deleteRestaurants([id]);
    setClosedBusyId(null);
    if (r.success) router.refresh();
  }

  const { matches } = pf;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants
      .filter((r) => {
        // Permanently closed and not yet reviewed: hidden here, shown in
        // the closed-review sheet instead.
        if (isHiddenClosed(r)) return false;
        if (!matches(r)) return false;
        if (!q) return true;
        return [r.name, r.cuisine, r.area, r.city, r.recommended_by, r.notes]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(q));
      })
      // Default order: alphabetical by name (case-insensitive, locale-aware).
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [restaurants, matches, query]);

  const selectedRestaurants = restaurants.filter((r) => selectedIds.has(r.id));

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

  async function addSelectedToProject() {
    if (!projectChosen || selectedIds.size === 0) return;
    setProjectBusy(true);
    setProjectError(null);
    const r = await addPlacesToProject(projectChosen, [...selectedIds]);
    setProjectBusy(false);
    if (!r.success) {
      setProjectError(r.error ?? "Couldn't add to the project.");
      return;
    }
    setProjectSheetOpen(false);
    setSelectMode(false);
    setSelectedIds(new Set());
    if (targetProjectId) {
      router.push(`/projects/${projectChosen}`);
    }
    router.refresh();
  }

  async function doDelete(ids: string[]) {
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await deleteRestaurants(ids);
    setDeleteBusy(false);
    if (!result.success) {
      setDeleteError(result.error ?? "Couldn't delete.");
      return;
    }
    setConfirmDeleteIds(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    router.refresh();
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

      {/* Filters + select toggle */}
      <div className="flex items-center justify-between gap-2">
        <FiltersButton filters={pf} />
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

      {/* Closed-place review banner */}
      {closedForReview.length > 0 && !selectMode ? (
        <button
          onClick={() => setReviewOpen(true)}
          className="w-full flex items-center gap-3 rounded-xl bg-coral/10 border border-coral/40 p-3 text-left"
        >
          <span className="w-8 h-8 rounded-lg bg-coral/20 text-coral flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-snow">
              {closedForReview.length === 1
                ? "1 place may have closed"
                : `${closedForReview.length} places may have closed`}
            </span>
            <span className="block text-xs text-fog">
              Google reports them permanently closed — review to keep or remove.
            </span>
          </span>
          <span className="text-coral text-xs font-semibold shrink-0">Review →</span>
        </button>
      ) : null}

      {/* 2-column tile grid (Groove library style) */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((r) => {
          const meta = STATUS_META[r.status];
          // Attribution shows only who recommended it (no "added by" —
          // the owner adds everything).
          const who = r.recommended_by;
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
                <PlacePhoto
                  restaurantId={r.id}
                  photoName={r.photos?.[0]}
                  googlePlaceId={r.google_place_id}
                  width={400}
                  className="w-full h-full object-cover"
                  fallback={
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-semibold"
                      style={{
                        backgroundColor: `${meta.pin}22`,
                        color: meta.pin,
                      }}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                  }
                />
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
              : "Nothing here yet — try a different tag or filter."}
          </p>
          {query.trim() ? (
            <GoogleFallbackSearch query={query.trim()} bias={searchBias} />
          ) : null}
        </div>
      ) : query.trim() ? (
        <GoogleFallbackSearch
          query={query.trim()}
          bias={searchBias}
          auto={false}
        />
      ) : null}

      {/* Add-to-project sheet (multi-select) */}
      {projectSheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-night/70"
          onClick={() => (projectBusy ? null : setProjectSheetOpen(false))}
        >
          <div
            className="w-full max-w-sm bg-ink border-t border-line rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] font-semibold text-white">
              {selectedIds.size === 1
                ? "Add 1 place to…"
                : `Add ${selectedIds.size} places to…`}
            </p>
            {localProjects.length === 0 && !projectNewOpen ? (
              <p className="text-sm text-fog">No projects yet — create one below.</p>
            ) : null}
            <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto no-scrollbar">
              {localProjects.map((p) => {
                const active = projectChosen === p.id;
                const sub = projectSubtitle(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => setProjectChosen(p.id)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-card/60"
                  >
                    <span
                      className={
                        active
                          ? "w-[18px] h-[18px] rounded-full border-[5px] border-coral shrink-0"
                          : "w-[18px] h-[18px] rounded-full border-2 border-line shrink-0"
                      }
                    />
                    <span className="min-w-0">
                      <span
                        className={
                          active
                            ? "block text-sm font-semibold text-snow"
                            : "block text-sm text-mist"
                        }
                      >
                        {p.name}
                      </span>
                      {sub ? (
                        <span className="block text-xs text-fog truncate">{sub}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {projectNewOpen ? (
              <NewProjectForm
                onCancel={() => setProjectNewOpen(false)}
                onCreated={(p) => {
                  setLocalProjects((l) => [...l, p]);
                  setProjectChosen(p.id);
                  setProjectNewOpen(false);
                }}
              />
            ) : (
              <button
                onClick={() => setProjectNewOpen(true)}
                className="w-full rounded-lg bg-card border border-dashed border-line text-fog px-4 py-2.5 text-sm"
              >
                + New project
              </button>
            )}

            {projectError ? (
              <p className="text-sm text-coral">{projectError}</p>
            ) : null}
            <button
              disabled={projectBusy || !projectChosen || selectedIds.size === 0}
              onClick={addSelectedToProject}
              className="w-full rounded-lg bg-coral text-ink py-3 text-sm font-semibold disabled:opacity-40"
            >
              {projectBusy
                ? "Adding…"
                : `Add to ${
                    localProjects.find((p) => p.id === projectChosen)?.name ?? "project"
                  }`}
            </button>
            <button
              disabled={projectBusy}
              onClick={() => setProjectSheetOpen(false)}
              className="w-full text-xs text-fog py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Closed-place review sheet */}
      {reviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-night/70"
          onClick={() => (closedBusyId ? null : setReviewOpen(false))}
        >
          <div
            className="w-full max-w-sm bg-ink border-t border-line rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-white">
                Possibly closed
              </p>
              <button
                onClick={() => setReviewOpen(false)}
                className="text-xs text-fog"
              >
                Done
              </button>
            </div>
            <p className="text-xs text-fog">
              Google reports these permanently closed. Keep one if it&apos;s
              still going, or remove it for good.
            </p>
            {closedForReview.length === 0 ? (
              <p className="text-sm text-fog text-center py-4">
                Nothing to review. 🎉
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto no-scrollbar">
                {closedForReview.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl bg-card border border-line p-3 space-y-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-snow truncate">
                        {r.name}
                      </p>
                      <p className="text-xs text-fog truncate">
                        {[r.cuisine, r.area ?? r.city]
                          .filter(Boolean)
                          .join(" · ") || "Permanently closed"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={closedBusyId === r.id}
                        onClick={() => keepClosed(r.id)}
                        className="flex-1 rounded-lg bg-card border border-line text-snow py-2 text-xs font-semibold disabled:opacity-40"
                      >
                        {closedBusyId === r.id ? "…" : "Keep"}
                      </button>
                      <button
                        disabled={closedBusyId === r.id}
                        onClick={() => removeClosed(r.id)}
                        className="flex-1 rounded-lg bg-coral text-ink py-2 text-xs font-semibold disabled:opacity-40"
                      >
                        {closedBusyId === r.id ? "…" : "Remove"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <FiltersSheet filters={pf} resultCount={filtered.length} />

      {/* Spacer so the floating bar doesn't cover the last tiles */}
      {selectMode ? <div className="h-24" /> : null}

      {/* Floating multi-select action bar */}
      {selectMode ? (
        <div className="fixed left-0 right-0 bottom-[84px] z-40 px-4">
          <div className="max-w-sm mx-auto bg-ink border border-line rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-3 flex items-center gap-3">
            <span className="flex-1 text-sm font-medium text-snow">
              {selectedIds.size === 0
                ? targetProjectId
                  ? "Tap places to add"
                  : "Tap places to select"
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
              className="rounded-lg bg-card border border-line text-snow px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Tag
            </button>
            <button
              disabled={selectedIds.size === 0}
              onClick={() => {
                setProjectError(null);
                setProjectNewOpen(false);
                setProjectSheetOpen(true);
              }}
              className="rounded-lg bg-coral text-ink px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Project
            </button>
            <button
              disabled={selectedIds.size === 0}
              onClick={() => {
                setDeleteError(null);
                setConfirmDeleteIds([...selectedIds]);
              }}
              aria-label="Delete selected"
              className="rounded-lg border border-coral/70 text-coral px-3 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {/* Multi-select delete confirmation */}
      {confirmDeleteIds && confirmDeleteIds.length > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-night/70"
          onClick={() => (deleteBusy ? null : setConfirmDeleteIds(null))}
        >
          <div
            className="w-full max-w-sm mx-4 mb-4 rounded-xl bg-ink border border-line p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[17px] font-semibold text-white">
              {confirmDeleteIds.length === 1
                ? `Delete “${restaurants.find((r) => r.id === confirmDeleteIds[0])?.name ?? "this place"}”?`
                : `Delete ${confirmDeleteIds.length} places?`}
            </p>
            <p className="text-sm text-fog">This can’t be undone.</p>
            {deleteError ? (
              <p className="text-sm text-coral">{deleteError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                disabled={deleteBusy}
                onClick={() => doDelete(confirmDeleteIds)}
                className="flex-1 bg-coral text-ink rounded-lg py-3 text-sm font-semibold disabled:opacity-40"
              >
                {deleteBusy ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                disabled={deleteBusy}
                onClick={() => setConfirmDeleteIds(null)}
                className="flex-1 bg-card border border-line text-snow rounded-lg py-3 text-sm"
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tag sheet (single tile or multi-select) */}
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
                ? `Tag “${moveTargets[0].name}” as…`
                : `Tag ${moveTargets.length} places as…`}
            </p>
            <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto no-scrollbar">
              {[{ id: null as string | null, name: "No tag" }, ...localFolders].map(
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
                  placeholder="Tag name"
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
                + New tag
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
