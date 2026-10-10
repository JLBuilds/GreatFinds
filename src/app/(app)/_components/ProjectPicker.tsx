"use client";

import { useState } from "react";
import { createProject } from "../projects/actions";
import { projectSubtitle, type Project } from "@/lib/types";

const inputBase =
  "w-full min-w-0 max-w-full rounded-lg border border-line px-3 py-2 font-body text-xs text-snow placeholder:text-fog/70 focus:outline-none focus:border-coral/60 [color-scheme:dark]";
/** Inputs sitting on the ink page background. */
const inputCls = `${inputBase} bg-card`;
/** Inputs sitting inside a card, so they need to be darker to read. */
const inputOnCardCls = `${inputBase} bg-ink`;

/** iOS renders an empty <input type="date"> as a blank box and gives it an
 *  intrinsic width that ignores the grid. Pin the size and overlay a hint
 *  until a date is picked. */
export function DateField({
  label,
  value,
  min,
  onChange,
  onCard = false,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
  /** Set when the field sits inside a card (darker well). */
  onCard?: boolean;
}) {
  return (
    <label className="block min-w-0 space-y-1">
      <span className="block font-body text-[10px] text-fog uppercase tracking-wide">
        {label}
      </span>
      <span className="relative block min-w-0">
        <input
          type="date"
          value={value}
          min={min || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${onCard ? inputOnCardCls : inputCls} block h-9 appearance-none`}
        />
        {!value ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-body text-xs text-fog/70"
          >
            Pick a date
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Inline "new project" form: name, optional city, optional dates. */
export function NewProjectForm({
  onCreated,
  onCancel,
  busyLabel = "Create",
}: {
  onCreated: (p: Project) => void;
  onCancel?: () => void;
  busyLabel?: string;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Give the project a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await createProject({
      name,
      city: city || null,
      start_date: start || null,
      end_date: end || null,
    });
    setBusy(false);
    if (!r.success || !r.projectId) {
      setError(r.error ?? "Couldn't create the project.");
      return;
    }
    onCreated({
      id: r.projectId,
      name: name.trim(),
      city: city.trim() || null,
      start_date: start || null,
      end_date: end || null,
      created_by: null,
      created_at: new Date().toISOString(),
    });
    setName("");
    setCity("");
    setStart("");
    setEnd("");
  }

  return (
    <div className="space-y-2 rounded-xl bg-card border border-line p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name (e.g. Dubai long weekend)"
        className={inputOnCardCls}
        autoFocus
      />
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City (optional)"
        className={inputOnCardCls}
      />
      <div className="grid grid-cols-2 gap-2 min-w-0">
        <DateField label="From (optional)" value={start} onChange={setStart} onCard />
        <DateField
          label="To (optional)"
          value={end}
          min={start}
          onChange={setEnd}
          onCard
        />
      </div>
      {error ? <p className="font-body text-xs text-coral">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="flex-1 rounded-lg bg-coral text-ink px-3 py-2 font-body text-xs font-semibold disabled:opacity-40"
        >
          {busy ? "…" : busyLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-ink border border-line text-mist px-3 py-2 font-body text-xs"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Multi-select project chips with an inline "+ New project". Controlled:
 *  `selected` is the set of project ids; `onChange` gets the new set. */
export function ProjectPicker({
  projects,
  selected,
  onChange,
  onProjectCreated,
  label = "Projects",
  hint,
}: {
  projects: Project[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Lets the parent keep its own project list in sync. */
  onProjectCreated?: (p: Project) => void;
  label?: string;
  hint?: string;
}) {
  const [local, setLocal] = useState<Project[]>(projects);
  const [newOpen, setNewOpen] = useState(false);
  const sel = new Set(selected);

  function toggle(id: string) {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="space-y-1.5">
      <span className="block font-body text-xs text-fog tracking-wide uppercase">
        {label}
      </span>
      {hint ? <p className="font-body text-xs text-fog/80">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {local.map((p) => {
          const active = sel.has(p.id);
          const sub = projectSubtitle(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              title={sub ?? undefined}
              className={
                active
                  ? "rounded-lg bg-lilac text-ink px-3 py-1.5 font-body text-xs font-semibold"
                  : "rounded-lg bg-card border border-line text-mist px-3 py-1.5 font-body text-xs"
              }
            >
              {active ? "✓ " : ""}
              {p.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setNewOpen((v) => !v)}
          className="rounded-lg bg-card border border-dashed border-line text-fog px-3 py-1.5 font-body text-xs"
        >
          + New project
        </button>
      </div>
      {newOpen ? (
        <NewProjectForm
          onCancel={() => setNewOpen(false)}
          onCreated={(p) => {
            setLocal((l) => [...l, p]);
            onProjectCreated?.(p);
            onChange([...sel, p.id]);
            setNewOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
