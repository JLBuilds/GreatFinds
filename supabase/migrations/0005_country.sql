-- Capture country so the location filter can go Country → City → Area.
-- Backfill existing rows from their stored address where possible (all
-- current places are in the UAE).

alter table public.restaurants add column if not exists country text;

update public.restaurants
set country = 'United Arab Emirates'
where country is null and address ilike '%United Arab Emirates%';

create index if not exists idx_restaurants_country on public.restaurants (country);
