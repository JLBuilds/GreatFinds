-- Business lifecycle, synced weekly from Google Places so closed places
-- can be flagged and reviewed rather than silently lingering.
--
-- business_status: Google's businessStatus — 'OPERATIONAL',
--   'CLOSED_TEMPORARILY' or 'CLOSED_PERMANENTLY'. Null until first checked.
-- closed_detected_at: when we first saw it permanently closed (cleared if
--   it reopens), so a grace period could be measured later.
-- dismissed_closed: the user reviewed a closed flag and chose to keep the
--   place anyway, so it shows normally again despite the status.
-- business_status_checked_at: throttles the weekly sweep.

alter table public.restaurants
  add column if not exists business_status text,
  add column if not exists closed_detected_at timestamptz,
  add column if not exists dismissed_closed boolean not null default false,
  add column if not exists business_status_checked_at timestamptz;
