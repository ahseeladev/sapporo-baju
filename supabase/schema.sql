-- Run this in Supabase: SQL Editor

create table if not exists public.orders (
  order_id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 100),
  parent_order_id bigint references public.orders(order_id) on delete set null,
  relationship text not null default 'Standalone'
    check (relationship in ('Head', 'Spouse', 'Child', 'Other', 'Standalone')),
  size_category text not null check (size_category in ('Kid', 'Adult')),
  size text not null check (char_length(trim(size)) between 1 and 20),
  custom_display_number text,
  custom_display_name text,
  memo text,
  delete_flag boolean not null default false,
  created_at timestamptz not null default now(),
  constraint parent_order_cannot_be_self check (parent_order_id is null or parent_order_id <> order_id)
);

create index if not exists orders_created_at_idx
  on public.orders(created_at desc);

create index if not exists orders_parent_order_id_idx
  on public.orders(parent_order_id);

alter table public.orders enable row level security;

-- Allow the public pre-order page to insert new orders.
create policy "Public can create shirt orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (delete_flag = false);

-- Hide soft-deleted records from signed-in dashboard users.
create policy "Authenticated users can read active shirt orders"
  on public.orders
  for select
  to authenticated
  using (delete_flag = false);

create policy "Authenticated users can update shirt orders"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete shirt orders"
  on public.orders
  for delete
  to authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant insert on table public.orders to anon, authenticated;
grant select on table public.orders to authenticated;
grant update, delete on table public.orders to authenticated;
