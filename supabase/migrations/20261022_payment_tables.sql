-- ============================================================
-- Migration: Payment Gateway Tables
-- Run in Supabase SQL Editor (Project: flumamltbxguvimcairr)
-- ============================================================

-- 1. ORDERS
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  customer_name   text not null check (char_length(customer_name) between 1 and 120),
  customer_email  text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone  text not null check (customer_phone ~ '^[0-9]{10,15}$'),
  amount          numeric(12, 2) not null check (amount > 0),
  currency        text not null default 'INR',
  status          text not null default 'pending'
                    check (status in ('pending','processing','paid','failed','cancelled','refunded')),
  cf_order_id     text unique,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. ORDER_ITEMS
create table if not exists public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  product_id            uuid not null references public.products(id),
  product_name_snapshot text not null,
  unit_price            numeric(12, 2) not null check (unit_price >= 0),
  quantity              int not null default 1 check (quantity > 0),
  subtotal              numeric(12, 2) not null check (subtotal >= 0)
);

-- 3. PAYMENTS
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  gateway             text not null default 'cashfree',
  gateway_order_id    text,
  gateway_payment_id  text,
  amount              numeric(12, 2) not null,
  currency            text not null default 'INR',
  status              text not null default 'pending'
                        check (status in ('pending','processing','paid','failed','cancelled','refunded')),
  payment_method      text,
  raw_webhook         jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 4. INDEXES
create index if not exists orders_status_idx       on public.orders(status);
create index if not exists orders_cf_order_id_idx  on public.orders(cf_order_id);
create index if not exists orders_email_idx        on public.orders(customer_email);
create index if not exists payments_order_id_idx   on public.payments(order_id);
create index if not exists payments_gw_order_idx   on public.payments(gateway_order_id);
create index if not exists payments_gw_payment_idx on public.payments(gateway_payment_id);

-- 5. UPDATED_AT TRIGGER
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- 6. RLS
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.payments     enable row level security;

-- Drop idempotently before recreating
drop policy if exists "staff_read_orders" on public.orders;
drop policy if exists "staff_read_order_items" on public.order_items;
drop policy if exists "staff_read_payments" on public.payments;

create policy "staff_read_orders" on public.orders
  for select using (private.is_staff(auth.uid()));

create policy "staff_read_order_items" on public.order_items
  for select using (private.is_staff(auth.uid()));

create policy "staff_read_payments" on public.payments
  for select using (private.is_staff(auth.uid()));

-- 7. ADMIN VIEW
create or replace view public.admin_orders as
  select
    o.id, o.customer_name, o.customer_email, o.customer_phone,
    o.amount, o.currency, o.status as order_status, o.cf_order_id,
    o.notes, o.created_at, o.updated_at,
    p.status as payment_status, p.payment_method, p.gateway_payment_id
  from public.orders o
  left join public.payments p on p.order_id = o.id;
