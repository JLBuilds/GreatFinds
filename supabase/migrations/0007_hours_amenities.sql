-- Opening hours, amenities and phone, synced from Google Places so the
-- app can show "Open · closes 5pm", meeting-friendly chips, and an
-- "Open now" filter without a Google call per place per page view.
--
-- opening_hours: Google's regularOpeningHours as returned (periods +
--   weekdayDescriptions). utc_offset_minutes lets "open now" be computed
--   in the place's own time zone.
-- amenities: raw booleans (outdoorSeating, reservable, goodForGroups,
--   parking…, payment…). google_synced_at throttles refreshes.

alter table public.restaurants
  add column if not exists opening_hours jsonb,
  add column if not exists utc_offset_minutes integer,
  add column if not exists amenities jsonb,
  add column if not exists phone text,
  add column if not exists google_synced_at timestamptz;
