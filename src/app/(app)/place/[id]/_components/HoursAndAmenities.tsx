"use client";

import { useState } from "react";
import { amenityChips, openStatus } from "@/lib/hours";
import type { Restaurant } from "@/lib/types";

/** "Open · closes 5pm" line (tap for the week), plus amenity chips. */
export function HoursAndAmenities({ place }: { place: Restaurant }) {
  const [open, setOpen] = useState(false);
  const status = openStatus(place.opening_hours, place.utc_offset_minutes);
  const week = place.opening_hours?.weekdayDescriptions ?? [];
  const chips = amenityChips(place.amenities);
  if (!status && chips.length === 0) return null;

  return (
    <div className="space-y-2">
      {status ? (
        <button
          type="button"
          onClick={() => week.length > 0 && setOpen((o) => !o)}
          className="flex items-center gap-2 font-body text-sm text-left"
          aria-expanded={open}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              status.isOpen ? "bg-emerald-400" : "bg-coral"
            }`}
          />
          <span className={status.isOpen ? "text-snow" : "text-mist"}>
            {status.label}
          </span>
          {week.length > 0 ? (
            <span className="text-fog text-xs">{open ? "▴" : "▾"}</span>
          ) : null}
        </button>
      ) : null}
      {open && week.length > 0 ? (
        <ul className="rounded-lg bg-card/60 border border-line px-3 py-2 space-y-0.5">
          {week.map((line) => {
            const [day, ...rest] = line.split(": ");
            return (
              <li key={line} className="flex justify-between gap-3 font-body text-xs">
                <span className="text-fog">{day}</span>
                <span className="text-snow text-right">{rest.join(": ")}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-md bg-card border border-line px-2 py-1 font-body text-[11px] text-mist"
            >
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
