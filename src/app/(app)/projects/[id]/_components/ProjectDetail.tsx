"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteProject,
  removePlaceFromProject,
  updateProject,
} from "../../actions";
import { PlacePhoto } from "../../../_components/PlacePhoto";
import {
  STATUS_META,
  priceLabel,
  projectSubtitle,
  type Project,
  type Restaurant,
} from "@/lib/types";

const inputCls =
  "w-full rounded-lg bg-card border border-line px-4 py-3 font-body text-sm text-snow placeholder:text-fog/70 focus:outline-none focus:border-coral/60 [color-scheme:dark]";
const labelCls = "block font-body text-xs text-fog tracking-wide uppercase";

export function ProjectDetail({
  project,
  places,
  isOwner,
}: {
  project: Project;
  places: Restaurant[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [city, setCity] = useState(project.city ?? "");
  const [start, setStart] = useState(project.start_date ?? "");
  const [end, setEnd] = useState(project.end_date ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const sub = projectSubtitle(project);

  async function save() {
    setBusy(true);
    setError(null);
    const r = await updateProject(project.id, {
      name,
      city: city || null,
      start_date: start || null,
      end_date: end || null,
    });
    setBusy(false);
    if (!r.success) {
      setError(r.error ?? "Couldn't save.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove(restaurantId: string) {
    setRemovingId(restaurantId);
    await removePlaceFromProject(project.id, restaurantId);
    setRemovingId(null);
    router.refresh();
  }

  if (editing) {
    return (
      <main className="max-w-sm mx-auto px-6 space-y-5">
        <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-ink/95 backdrop-blur border-b border-line flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setConfirmDelete(false);
              setName(project.name);
              setCity(project.city ?? "");
              setStart(project.start_date ?? "");
              setEnd(project.end_date ?? "");
            }}
            className="font-body text-sm text-fog"
          >
            Cancel
          </button>
          <span className="text-sm font-semibold text-white">Edit project</span>
          <button
            type="button"
            onClick={save}
            disabled={busy || !name.trim()}
            className="rounded-lg bg-coral text-ink px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className={labelCls}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>From</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>To</label>
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {error ? <p className="font-body text-sm text-coral text-center">{error}</p> : null}
        </div>

        <div className="pt-4 border-t border-line">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="font-body text-sm text-mist text-center">
                Delete “{project.name}”? The places stay in your list.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => deleteProject(project.id)}
                  className="flex-1 bg-coral text-ink rounded-lg py-3 font-body font-semibold"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 bg-card border border-line text-snow rounded-lg py-3 font-body"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full font-body text-sm text-coral/90 py-2"
            >
              Delete this project
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-6 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/projects" className="font-body text-sm text-fog">
          ← Projects
        </Link>
        {isOwner ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit project"
            className="w-9 h-9 rounded-lg bg-ink/80 border border-line flex items-center justify-center text-snow"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M13.5 8.5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <header className="space-y-1">
        <h1 className="text-[28px] font-semibold text-white leading-tight tracking-[-0.01em]">
          {project.name}
        </h1>
        {sub ? <p className="font-body text-sm text-fog">{sub}</p> : null}
        <p className="font-body text-xs text-fog/80">
          {places.length} place{places.length === 1 ? "" : "s"}
        </p>
      </header>

      <Link
        href={`/?project=${project.id}`}
        className="block w-full text-center bg-coral text-ink rounded-lg py-3 font-body font-semibold hover:opacity-90"
      >
        Add places from your list →
      </Link>

      {places.length === 0 ? (
        <div className="rounded-xl bg-card/60 border border-line p-6 text-center">
          <p className="text-sm text-fog">
            Nothing here yet. Open your list, tap Select, pick places, then
            “Project”.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {places.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <div key={r.id} className="relative">
                <Link
                  href={`/place/${r.id}`}
                  className="rounded-xl bg-card border border-line overflow-hidden flex flex-col hover:border-coral/60 transition-colors"
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
                          style={{ backgroundColor: `${meta.pin}22`, color: meta.pin }}
                        >
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      }
                    />
                  </div>
                  <div className="p-3 space-y-0.5">
                    <p className="text-sm font-semibold text-white leading-tight">{r.name}</p>
                    <p className="text-xs text-fog truncate">
                      {[r.cuisine, r.area ?? r.city].filter(Boolean).join(" · ")}
                    </p>
                    {r.price_range || r.price_level ? (
                      <p className="text-xs text-fog">
                        {r.price_range ?? priceLabel(r.price_level)}
                      </p>
                    ) : null}
                  </div>
                </Link>
                <button
                  type="button"
                  disabled={removingId === r.id}
                  onClick={() => remove(r.id)}
                  aria-label={`Remove ${r.name} from project`}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/85 border border-line text-mist flex items-center justify-center disabled:opacity-40"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
