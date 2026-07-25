-- GreatFind initial schema.
--
-- Model: one shared list. Every member of the app sees every saved
-- restaurant (that's the point — a family/friends shared map), but rows
-- are attributed to whoever added them and only the author (or an admin
-- via service role) can edit/delete their own entries.
--
-- Invite-only signup carried over from Groove: admins create invites
-- with a unique token; strangers use access_requests to ask in.

-- ---------------------------------------------------------------------
-- profiles — display names for attribution ("added by Jo")
-- ---------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone signed in can see everyone's display name (needed for
-- attribution on shared restaurants).
create policy "profiles: authenticated select" on public.profiles
  for select to authenticated using (true);

create policy "profiles: own insert" on public.profiles
  for insert to authenticated with check (user_id = auth.uid());

create policy "profiles: own update" on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-create a profile row on signup, defaulting the display name to
-- the email's local part ("jo" from jo@example.com). Editable in /you.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Someone'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- restaurants — the shared list
-- ---------------------------------------------------------------------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  name text not null,
  cuisine text,
  area text,
  city text,
  price_level int check (price_level between 1 and 4),
  status text not null default 'want_to_try'
    check (status in ('want_to_try', 'been', 'favorite')),
  recommended_by text,
  notes text,
  link text,
  -- Google Places fields (filled by the lookup; null for manual entries)
  google_place_id text,
  google_maps_url text,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_restaurants_status on public.restaurants (status);
create index idx_restaurants_created_at on public.restaurants (created_at desc);

alter table public.restaurants enable row level security;

-- Shared list: every signed-in member reads everything.
create policy "restaurants: authenticated select" on public.restaurants
  for select to authenticated using (true);

create policy "restaurants: own insert" on public.restaurants
  for insert to authenticated with check (created_by = auth.uid());

create policy "restaurants: own update" on public.restaurants
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "restaurants: own delete" on public.restaurants
  for delete to authenticated using (created_by = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- invites + access_requests — invite-only signup (from Groove, with the
-- reviewed_by ON DELETE SET NULL fix baked in)
-- ---------------------------------------------------------------------

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  invited_by uuid not null references auth.users (id) on delete cascade,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  note text,
  unique (email)
);

create index idx_invites_token on public.invites (token);
create index idx_invites_email on public.invites (email);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  message text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  unique (email)
);

create index idx_access_requests_status on public.access_requests (status);

alter table public.invites enable row level security;
alter table public.access_requests enable row level security;

-- invites: deny-all for clients; server actions use the service-role key.
-- access_requests: anyone can INSERT (the public request-access form).
create policy "access_requests: public insert" on public.access_requests
  for insert to anon, authenticated with check (true);
