"use client";

import { useState } from "react";
import type { Folder, RestaurantStatus } from "@/lib/types";
import { createFolder } from "../actions";

/** The editable fields shared by the Add and Edit forms. */
export type PlaceDraft = {
  name: string;
  cuisine: string;
  area: string;
  city: string;
  price_level: number | null;
  price_range: string | null;
  status: RestaurantStatus;
  recommended_by: string;
  notes: string;
  link: string;
  google_place_id: string | null;
  google_maps_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[] | null;
  folder_id: string | null;
};

export const EMPTY_DRAFT: PlaceDraft = {
  name: "",
  cuisine: "",
  area: "",
  city: "",
  price_level: null,
  price_range: null,
  status: "want_to_try",
  recommended_by: "",
  notes: "",
  link: "",
  google_place_id: null,
  google_maps_url: null,
  address: null,
  lat: null,
  lng: null,
  photos: null,
  folder_id: null,
};

const STATUS_OPTIONS: Array<{ key: RestaurantStatus; label: string }> = [
  { key: "want_to_try", label: "✨ Want to try" },
  { key: "been", label: "✓ Been" },
  { key: "favorite", label: "♥ Favourite" },
];

const inputCls =
  "w-full rounded-lg bg-card border border-line px-4 py-3 font-body text-sm text-snow placeholder:text-fog/70 focus:outline-none focus:border-coral/60";
const labelCls = "block font-body text-xs text-fog tracking-wide uppercase";

export function PlaceFields({
  draft,
  onChange,
  folders,
}: {
  draft: PlaceDraft;
  onChange: (next: PlaceDraft) => void;
  folders: Folder[];
}) {
  const set = (patch: Partial<PlaceDraft>) => onChange({ ...draft, ...patch });
  const [localFolders, setLocalFolders] = useState<Folder[]>(folders);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

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
    set({ folder_id: folder.id });
    setNewFolderName("");
    setNewFolderOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="pf-name" className={labelCls}>
          Name
        </label>
        <input
          id="pf-name"
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          required
          className={inputCls}
        />
        {draft.address ? (
          <p className="font-body text-xs text-fog/80 pt-0.5">
            📍 {draft.address}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <span className={labelCls}>Status</span>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => set({ status: s.key })}
              className={
                draft.status === s.key
                  ? "flex-1 rounded-lg bg-coral text-ink px-3 py-2 font-body text-xs font-semibold"
                  : "flex-1 rounded-lg bg-card border border-line text-mist px-3 py-2 font-body text-xs"
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Folder */}
      <div className="space-y-1.5">
        <span className={labelCls}>Folder</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => set({ folder_id: null })}
            className={
              draft.folder_id === null
                ? "rounded-lg bg-coral text-ink px-3 py-1.5 font-body text-xs font-semibold"
                : "rounded-lg bg-card border border-line text-mist px-3 py-1.5 font-body text-xs"
            }
          >
            None
          </button>
          {localFolders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => set({ folder_id: f.id })}
              className={
                draft.folder_id === f.id
                  ? "rounded-lg bg-coral text-ink px-3 py-1.5 font-body text-xs font-semibold"
                  : "rounded-lg bg-card border border-line text-mist px-3 py-1.5 font-body text-xs"
              }
            >
              {f.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNewFolderOpen((v) => !v)}
            className="rounded-lg bg-card border border-dashed border-line text-fog px-3 py-1.5 font-body text-xs"
          >
            + New folder
          </button>
        </div>
        {newFolderOpen ? (
          <div className="flex gap-2 pt-1">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 rounded-lg bg-card border border-line px-3 py-2 font-body text-xs text-snow placeholder:text-fog/70 focus:outline-none"
            />
            <button
              type="button"
              onClick={addFolder}
              disabled={folderBusy || !newFolderName.trim()}
              className="rounded-lg bg-coral text-ink px-4 py-2 font-body text-xs font-semibold disabled:opacity-40"
            >
              {folderBusy ? "…" : "Create"}
            </button>
          </div>
        ) : null}
        {folderError ? (
          <p className="font-body text-xs text-coral">{folderError}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="pf-cuisine" className={labelCls}>
            Cuisine
          </label>
          <input
            id="pf-cuisine"
            value={draft.cuisine}
            onChange={(e) => set({ cuisine: e.target.value })}
            placeholder="Lebanese"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="pf-area" className={labelCls}>
            Area
          </label>
          <input
            id="pf-area"
            value={draft.area}
            onChange={(e) => set({ area: e.target.value })}
            placeholder="JLT"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="pf-city" className={labelCls}>
            City
          </label>
          <input
            id="pf-city"
            value={draft.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Dubai"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <span className={labelCls}>Price</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  set({ price_level: draft.price_level === p ? null : p })
                }
                className={
                  draft.price_level != null && p <= draft.price_level
                    ? "flex-1 rounded-lg bg-coral text-ink py-3 font-body text-xs font-semibold"
                    : "flex-1 rounded-lg bg-card border border-line text-fog py-3 font-body text-xs"
                }
              >
                $
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="pf-who" className={labelCls}>
          Recommended by
        </label>
        <input
          id="pf-who"
          value={draft.recommended_by}
          onChange={(e) => set({ recommended_by: e.target.value })}
          placeholder="Who told you about it?"
          className={inputCls}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pf-notes" className={labelCls}>
          Notes
        </label>
        <textarea
          id="pf-notes"
          rows={3}
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Get the mixed grill. Book ahead on weekends."
          className={inputCls}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pf-link" className={labelCls}>
          Link
        </label>
        <input
          id="pf-link"
          type="url"
          value={draft.link}
          onChange={(e) => set({ link: e.target.value })}
          placeholder="Menu, Instagram…"
          className={inputCls}
        />
      </div>
    </div>
  );
}
