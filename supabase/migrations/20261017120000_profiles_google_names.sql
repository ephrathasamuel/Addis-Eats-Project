-- Google OAuth users carry their display name in raw_user_meta_data as
-- "full_name" and/or "name". Use whichever is present before falling back to
-- the email prefix, so a Google sign-in shows the person's real name.

create or replace function public.handle_new_addis_eats_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(new.raw_user_meta_data ->> 'name', ''),
        split_part(coalesce(new.email, ''), '@', 1)
      ),
      80
    ),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_addis_eats_user() from public, anon, authenticated;

-- Backfill profiles created before this fix that only got the email prefix.
update public.profiles p
set full_name = left(u.raw_user_meta_data ->> 'name', 80)
from auth.users u
where p.id = u.id
  and coalesce(u.raw_user_meta_data ->> 'full_name', '') = ''
  and coalesce(u.raw_user_meta_data ->> 'name', '') <> ''
  and p.full_name = split_part(coalesce(u.email, ''), '@', 1);
