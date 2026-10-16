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
