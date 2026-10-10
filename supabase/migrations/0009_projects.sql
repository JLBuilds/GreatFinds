-- Projects: named collections of places for a trip or an occasion, with an
-- optional city and optional dates. A place can belong to many projects
-- (unlike tags, which are one-per-place), so membership is a join table.
--
-- Everyone sees every project; anyone can create one and add/remove
-- places (trips are collaborative); only the creator can rename/delete.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  start_date date,
  end_date date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects: authenticated select" on public.projects
  for select to authenticated using (true);

create policy "projects: authenticated insert" on public.projects
  for insert to authenticated with check (created_by = auth.uid());

create policy "projects: own update" on public.projects
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "projects: own delete" on public.projects
  for delete to authenticated using (created_by = auth.uid());

create table public.project_places (
  project_id uuid not null references public.projects (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (project_id, restaurant_id)
);

alter table public.project_places enable row level security;

create policy "project_places: authenticated select" on public.project_places
  for select to authenticated using (true);

create policy "project_places: authenticated insert" on public.project_places
  for insert to authenticated with check (added_by = auth.uid());

create policy "project_places: authenticated delete" on public.project_places
  for delete to authenticated using (true);

create index idx_project_places_restaurant on public.project_places (restaurant_id);
