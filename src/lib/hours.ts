/** Pure helpers for Google opening hours. No Google calls here. */

export type HoursPoint = { day: number; hour: number; minute: number };
export type HoursPeriod = { open: HoursPoint; close?: HoursPoint };
export type OpeningHours = {
  periods?: HoursPeriod[];
  weekdayDescriptions?: string[];
};

export type OpenStatus = {
  isOpen: boolean;
  /** e.g. "Open · closes 1am", "Closed · opens 12pm", "Closed · opens Tue 12pm" */
  label: string;
  /** Google's opening-hours text: for the expanded list. */
};

const WEEK = 7 * 1440;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 13:00 → "1pm", 12:30 → "12:30pm", 0:00 → "12am" */
export function formatClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "am" : "pm";
  return minute ? `${h12}:${String(minute).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;
}

function weekMinute(p: HoursPoint): number {
  return p.day * 1440 + p.hour * 60 + p.minute;
}

/**
 * Where a place is in its week right now, with "now" shifted into the
 * place's own time zone using Google's utcOffsetMinutes.
 */
function nowInPlaceWeek(utcOffsetMinutes: number, now: Date): number {
  const shifted = new Date(now.getTime() + utcOffsetMinutes * 60_000);
  return (
    shifted.getUTCDay() * 1440 +
    shifted.getUTCHours() * 60 +
    shifted.getUTCMinutes()
  );
}

/** Open/closed right now. Returns null when hours are unknown. */
export function openStatus(
  hours: OpeningHours | null | undefined,
  utcOffsetMinutes: number | null | undefined,
  now: Date = new Date(),
): OpenStatus | null {
  const periods = hours?.periods;
  if (!periods || periods.length === 0 || utcOffsetMinutes == null) return null;

  // Google encodes "always open" as one period starting Sunday 00:00 with no close.
  if (periods.length === 1 && !periods[0].close) {
    const o = periods[0].open;
    if (o.day === 0 && o.hour === 0 && o.minute === 0) {
      return { isOpen: true, label: "Open 24 hours" };
    }
  }

  const t = nowInPlaceWeek(utcOffsetMinutes, now);

  // Normalise each period to [start, end) on a week timeline, letting
  // overnight/wrap-around periods extend past the end of the week.
  const spans = periods
    .filter((p) => p?.open)
    .map((p) => {
      const start = weekMinute(p.open);
      let end = p.close ? weekMinute(p.close) : start + 1440;
      if (end <= start) end += WEEK;
      return { start, end, close: p.close, open: p.open };
    });

  for (const s of spans) {
    for (const tt of [t, t + WEEK]) {
      if (tt >= s.start && tt < s.end) {
        const closes = s.close
          ? `closes ${formatClock(s.close.hour, s.close.minute)}`
          : "open late";
        return { isOpen: true, label: `Open · ${closes}` };
      }
    }
  }

  // Closed: find the next opening.
  let best: { delta: number; open: HoursPoint } | null = null;
  for (const s of spans) {
    const delta = (s.start - t + WEEK) % WEEK;
    if (!best || delta < best.delta) best = { delta, open: s.open };
  }
  if (!best) return { isOpen: false, label: "Closed" };
  const todayDay = Math.floor(t / 1440);
  const sameDay = best.open.day === todayDay && best.delta < 1440;
  const when = formatClock(best.open.hour, best.open.minute);
  return {
    isOpen: false,
    label: sameDay ? `Closed · opens ${when}` : `Closed · opens ${DAYS[best.open.day]} ${when}`,
  };
}

/** Google's amenity booleans, stored raw. */
export type Amenities = {
  outdoorSeating?: boolean;
  reservable?: boolean;
  goodForGroups?: boolean;
  goodForChildren?: boolean;
  allowsDogs?: boolean;
  liveMusic?: boolean;
  servesCoffee?: boolean;
  restroom?: boolean;
  parkingOptions?: Record<string, boolean>;
  paymentOptions?: Record<string, boolean>;
};

/** Human labels for the chips row, only for what's true. */
export function amenityChips(a: Amenities | null | undefined): string[] {
  if (!a) return [];
  const out: string[] = [];
  if (a.reservable) out.push("Takes bookings");
  if (a.outdoorSeating) out.push("Outdoor seating");
  if (a.goodForGroups) out.push("Good for groups");
  const parking = a.parkingOptions ?? {};
  if (parking.valetParking) out.push("Valet");
  else if (Object.values(parking).some(Boolean)) out.push("Parking");
  const pay = a.paymentOptions ?? {};
  if (pay.acceptsCashOnly) out.push("Cash only");
  else if (pay.acceptsCreditCards || pay.acceptsDebitCards || pay.acceptsNfc) {
    out.push("Cards accepted");
  }
  if (a.servesCoffee) out.push("Serves coffee");
  if (a.liveMusic) out.push("Live music");
  if (a.goodForChildren) out.push("Kid-friendly");
  if (a.allowsDogs) out.push("Dogs welcome");
  return out;
}

/** True when a row's Google details are missing or older than `maxAgeMs`. */
export function needsSync(
  syncedAt: string | null | undefined,
  maxAgeMs = 7 * 24 * 3600 * 1000,
  now: Date = new Date(),
): boolean {
  if (!syncedAt) return true;
  const t = new Date(syncedAt).getTime();
  return !Number.isFinite(t) || now.getTime() - t > maxAgeMs;
}
