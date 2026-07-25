-- Photos, price range, and folders.
--
-- photos: Google Places photo resource names (e.g.
-- "places/ChIJ…/photos/AWU5…"). The app renders them via the Places
-- media endpoint with the public browser key. First photo doubles as
-- the header image and the square list icon.
--
-- folders: shared collections ("Abu Dhabi street food", "Date nights").
-- Everyone sees all folders; anyone can create; only the creator can
-- rename/delete. Deleting a folder leaves its restaurants intact.

alter table public.restaurants
  add column if not exists photos text[],
  add column if not exists price_range text;

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table public.folders enable row level security;

create policy "folders: authenticated select" on public.folders
  for select to authenticated using (true);

create policy "folders: authenticated insert" on public.folders
  for insert to authenticated with check (created_by = auth.uid());

create policy "folders: own update" on public.folders
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "folders: own delete" on public.folders
  for delete to authenticated using (created_by = auth.uid());

alter table public.restaurants
  add column if not exists folder_id uuid references public.folders (id) on delete set null;

create index idx_restaurants_folder on public.restaurants (folder_id);
