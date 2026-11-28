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
drop policy if exists "Public can create shirt orders" on public.orders;
create policy "Public can create shirt orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (delete_flag = false);

-- Hide soft-deleted records from signed-in dashboard users.
drop policy if exists "Authenticated users can read active shirt orders" on public.orders;
create policy "Authenticated users can read active shirt orders"
  on public.orders
  for select
  to authenticated
  using (delete_flag = false);

drop policy if exists "Authenticated users can update shirt orders" on public.orders;
create policy "Authenticated users can update shirt orders"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete shirt orders" on public.orders;
create policy "Authenticated users can delete shirt orders"
  on public.orders
  for delete
  to authenticated
  using (true);

drop policy if exists "Public can edit or soft delete active shirt orders" on public.orders;
create policy "Public can edit or soft delete active shirt orders"
  on public.orders
  as permissive
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read active shirt orders" on public.orders;
create policy "Public can read active shirt orders"
  on public.orders
  for select
  to anon, authenticated
  using (delete_flag = false);

grant usage on schema public to anon, authenticated, service_role;
grant insert on table public.orders to anon, authenticated;
grant select, update on table public.orders to anon, authenticated;
grant select, insert, update, delete on table public.orders to authenticated, service_role;

-- Secure edit authorization is handled per card by the frontend private code.

-- Public, read-only order summary view. It deliberately excludes edit tokens and memo.
create or replace view public.ordered_shirt_list with (security_invoker=false) as
select
  order_id,
  name,
  parent_order_id,
  relationship,
  size_category,
  size,
  custom_display_number,
  custom_display_name,
  created_at
from public.orders
where delete_flag = false;

grant select on public.ordered_shirt_list to anon, authenticated;

-- Optional server-side soft-delete RPC. Run this section after the table policies.
create or replace function public.soft_delete_order(order_id_input bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.orders
  set delete_flag = true
  where order_id = order_id_input
    and delete_flag = false;

  select true;
$$;

revoke all on function public.soft_delete_order(bigint) from public, anon, authenticated;
grant execute on function public.soft_delete_order(bigint) to anon, authenticated;
