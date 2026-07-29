-- Add 'shopping' as a fourth listing type.

alter table public.restaurants drop constraint if exists restaurants_type_check;
alter table public.restaurants
  add constraint restaurants_type_check
    check (type in ('restaurant', 'experience', 'hotel', 'shopping'));
