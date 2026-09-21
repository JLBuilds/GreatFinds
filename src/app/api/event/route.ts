import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

/** Escape text for an iCalendar property value. */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** GET /api/event?id=<restaurant>&start=<ISO>&minutes=<n> → .ics file
 *  for "Meet here". Signed-in members only. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const start = new Date(searchParams.get("start") ?? "");
  const minutes = Math.min(Math.max(Number(searchParams.get("minutes") ?? 60), 15), 600);
  if (!id || !Number.isFinite(start.getTime())) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("restaurants")
    .select("id, name, address, lat, lng, google_place_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const place = data as Pick<
    Restaurant,
    "id" | "name" | "address" | "lat" | "lng" | "google_place_id"
  >;

  const end = new Date(start.getTime() + minutes * 60_000);
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const dest =
    place.lat != null && place.lng != null
      ? `${place.lat},${place.lng}`
      : `${place.name} ${place.address ?? ""}`.trim();
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${
    place.google_place_id ? `&destination_place_id=${encodeURIComponent(place.google_place_id)}` : ""
  }`;
  const location = [place.name, place.address].filter(Boolean).join(", ");
  const description = `Directions: ${dir}\nGreatFinds: ${origin}/s/${place.id}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GreatFinds//Meet here//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${place.id}-${stamp(start)}@greatfinds`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`Meet at ${place.name}`)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description)}`,
    `URL:${origin}/s/${place.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="meet-at-${place.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
