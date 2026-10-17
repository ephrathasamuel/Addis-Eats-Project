-- Addis Eats: run this whole file once in Supabase > SQL Editor > New query > Run.
-- It is safe to run again. (Same content as the files in supabase/migrations.)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer'
    check (role in ('customer', 'staff', 'delivery', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

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
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)), 80),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_addis_eats_user() from public, anon, authenticated;

drop trigger if exists on_addis_eats_auth_user_created on auth.users;
create trigger on_addis_eats_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_addis_eats_user();
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

-- Shared app data (accounts, staff, dishes, orders, expenses) so every server
-- instance sees the same records. Only the server's secret key can access it.
create table if not exists public.addis_records (
  collection text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

alter table public.addis_records enable row level security;
revoke all on table public.addis_records from anon, authenticated;
