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
