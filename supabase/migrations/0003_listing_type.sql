-- Listings can be a restaurant or an experience. Experiences price on a
-- different scale, so the app picks price bands by type. Existing rows
-- default to 'restaurant'.

alter table public.restaurants
  add column if not exists type text not null default 'restaurant'
    check (type in ('restaurant', 'experience'));

create index if not exists idx_restaurants_type on public.restaurants (type);
