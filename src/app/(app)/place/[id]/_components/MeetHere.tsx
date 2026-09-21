"use client";

import { useState } from "react";
import type { Restaurant } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local "YYYY-MM-DDTHH:MM" for <input type="datetime-local">: next full hour. */
function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 2026-09-24T06:00:00.000Z → 20260924T060000Z */
function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function directionsUrl(place: Restaurant): string | null {
  const dest =
    place.lat != null && place.lng != null
      ? `${place.lat},${place.lng}`
      : place.address
        ? `${place.name} ${place.address}`
        : null;
  if (!dest) return null;
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  u.searchParams.set("destination", dest);
  if (place.google_place_id) {
    u.searchParams.set("destination_place_id", place.google_place_id);
  }
  return u.toString();
}

/** Pick a time, then add the meeting to a calendar or share the details. */
export function MeetHere({ place }: { place: Restaurant }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(defaultStart);
  const [minutes, setMinutes] = useState(60);
  const [note, setNote] = useState<string | null>(null);

  const startDate = new Date(start);
  const valid = Number.isFinite(startDate.getTime());
  const endDate = new Date(startDate.getTime() + minutes * 60_000);
  const title = `Meet at ${place.name}`;
  const location = [place.name, place.address].filter(Boolean).join(", ");
  const dir = directionsUrl(place);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareLink = `${origin}/s/${place.id}`;
  const details = [dir ? `Directions: ${dir}` : null, `GreatFinds: ${shareLink}`]
    .filter(Boolean)
    .join("\n");

  const googleCal = (() => {
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE");
    u.searchParams.set("text", title);
    u.searchParams.set("dates", `${icsStamp(startDate)}/${icsStamp(endDate)}`);
    u.searchParams.set("location", location);
    u.searchParams.set("details", details);
    return u.toString();
  })();

  const icsHref = `/api/event?id=${encodeURIComponent(place.id)}&start=${encodeURIComponent(startDate.toISOString())}&minutes=${minutes}`;

  const when = valid
    ? startDate.toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  async function shareDetails() {
    const text = [title, when, place.address, dir, shareLink]
      .filter(Boolean)
      .join("\n");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ title, text });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied");
      setTimeout(() => setNote(null), 2000);
    } catch {
      setNote("Couldn't copy");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-card border border-line text-snow rounded-lg py-3 font-body font-medium hover:bg-card/80"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Meet here
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-card/60 border border-line p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm font-semibold text-white">Meet at {place.name}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-body text-xs text-fog"
        >
          Close
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="flex-1 min-w-0 rounded-lg bg-card border border-line px-3 py-2 font-body text-sm text-snow focus:outline-none [color-scheme:dark]"
        />
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="rounded-lg bg-card border border-line px-2 py-2 font-body text-sm text-snow focus:outline-none"
          aria-label="Duration"
        >
          <option value={30}>30 min</option>
          <option value={60}>1 hr</option>
          <option value={90}>1½ hr</option>
          <option value={120}>2 hr</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={valid ? icsHref : undefined}
          className="text-center bg-coral text-ink rounded-lg py-2.5 font-body text-sm font-semibold"
        >
          Add to Calendar
        </a>
        <a
          href={valid ? googleCal : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center bg-card border border-line text-snow rounded-lg py-2.5 font-body text-sm font-medium"
        >
          Google Calendar
        </a>
      </div>
      <button
        type="button"
        onClick={shareDetails}
        className="w-full bg-card border border-line text-snow rounded-lg py-2.5 font-body text-sm font-medium"
      >
        {note ?? "Share meeting details"}
      </button>
      <p className="font-body text-[11px] text-fog">
        “Add to Calendar” opens your phone’s calendar (Apple, Outlook…).
      </p>
    </div>
  );
}
