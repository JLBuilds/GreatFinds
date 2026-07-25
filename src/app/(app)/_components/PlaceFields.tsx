"use client";

import type { RestaurantStatus } from "@/lib/types";

/** The editable fields shared by the Add and Edit forms. */
export type PlaceDraft = {
  name: string;
  cuisine: string;
  area: string;
  city: string;
  price_level: number | null;
  status: RestaurantStatus;
  recommended_by: string;
  notes: string;
  link: string;
  google_place_id: string | null;
  google_maps_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export const EMPTY_DRAFT: PlaceDraft = {
  name: "",
  cuisine: "",
  area: "",
  city: "",
  price_level: null,
  status: "want_to_try",
  recommended_by: "",
  notes: "",
  link: "",
  google_place_id: null,
  google_maps_url: null,
  address: null,
  lat: null,
  lng: null,
};

const STATUS_OPTIONS: Array<{ key: RestaurantStatus; label: string }> = [
  { key: "want_to_try", label: "✨ Want to try" },
  { key: "been", label: "✓ Been" },
  { key: "favorite", label: "♥ Favourite" },
];

const inputCls =
  "w-full rounded-2xl bg-white/70 px-4 py-3 font-body text-sm text-basil placeholder:text-basil/40 focus:outline-none focus:bg-white";
const labelCls =
  "block font-body text-xs text-basil/70 tracking-wide uppercase";

export function PlaceFields({
  draft,
  onChange,
}: {
  draft: PlaceDraft;
  onChange: (next: PlaceDraft) => void;
}) {
  const set = (patch: Partial<PlaceDraft>) => onChange({ ...draft, ...patch });

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
          <p className="font-body text-xs text-basil/50 pt-0.5">
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
                  ? "flex-1 rounded-full bg-basil text-cream px-3 py-2 font-body text-xs font-medium"
                  : "flex-1 rounded-full bg-white/70 text-basil/70 px-3 py-2 font-body text-xs"
              }
            >
              {s.label}
            </button>
          ))}
        </div>
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
                    ? "flex-1 rounded-xl bg-basil text-cream py-3 font-body text-xs font-medium"
                    : "flex-1 rounded-xl bg-white/70 text-basil/50 py-3 font-body text-xs"
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
