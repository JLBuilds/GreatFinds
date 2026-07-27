-- Make listings and folders PERSONAL (per-user), not shared. Each user
-- sees only what they added. Sharing a specific place is explicit, via a
-- public share link (/s/[id]) that reads through the service role.
--
-- Also add 'hotel' as a listing type.

-- Restaurants: read only your own rows (insert/update/delete were already
-- own-only).
drop policy if exists "restaurants: authenticated select" on public.restaurants;
create policy "restaurants: own select" on public.restaurants
  for select to authenticated using (created_by = auth.uid());

-- Folders: read only your own.
drop policy if exists "folders: authenticated select" on public.folders;
create policy "folders: own select" on public.folders
  for select to authenticated using (created_by = auth.uid());

-- Folder names are unique per user now, not globally.
alter table public.folders drop constraint if exists folders_name_key;
alter table public.folders
  add constraint folders_name_created_by_key unique (created_by, name);

-- Allow the hotel type.
alter table public.restaurants drop constraint if exists restaurants_type_check;
alter table public.restaurants
  add constraint restaurants_type_check
    check (type in ('restaurant', 'experience', 'hotel'));
