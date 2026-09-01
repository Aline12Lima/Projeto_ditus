create extension if not exists pgcrypto;

create type public.order_status as enum (
  'RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE',
  'AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO'
);
create type public.table_status as enum ('LIVRE', 'OCUPADA', 'AGUARDANDO_PAGAMENTO');
create type public.session_status as enum ('ABERTA', 'ENCERRADA', 'CANCELADA');
create type public.staff_role as enum ('ADMIN', 'ATENDENTE', 'COZINHA');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_translations jsonb not null check (jsonb_typeof(name_translations) = 'object' and name_translations ? 'pt'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on update cascade on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_translations jsonb not null check (jsonb_typeof(name_translations) = 'object' and name_translations ? 'pt'),
  description_translations jsonb not null default '{}'::jsonb check (jsonb_typeof(description_translations) = 'object'),
  price numeric(12,2) not null check (price > 0),
  image_url text,
  emoji text not null default '🍽️',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_tables (
  id smallint primary key generated always as identity,
  number smallint not null unique check (number between 1 and 45),
  status public.table_status not null default 'LIVRE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id smallint not null references public.restaurant_tables(id) on update cascade on delete restrict,
  status public.session_status not null default 'ABERTA',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'ABERTA' and closed_at is null) or (status <> 'ABERTA' and closed_at is not null))
);
create unique index one_open_session_per_table on public.table_sessions(table_id) where status = 'ABERTA';

create table public.orders (
  id bigint primary key generated always as identity,
  session_id uuid not null references public.table_sessions(id) on update cascade on delete restrict,
  status public.order_status not null default 'RECEBIDO',
  notes text not null default '' check (char_length(notes) <= 1000),
  total numeric(12,2) not null default 0 check (total >= 0),
  idempotency_key uuid not null unique,
  tracking_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  check ((status = 'PAGO' and paid_at is not null) or status <> 'PAGO'),
  check ((status = 'CANCELADO' and cancelled_at is not null) or status <> 'CANCELADO')
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id bigint not null references public.orders(id) on update cascade on delete cascade,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price > 0),
  quantity integer not null check (quantity > 0 and quantity <= 99),
  subtotal numeric(12,2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null default 'ADMIN',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products(category_id);
create index table_sessions_table_id_idx on public.table_sessions(table_id);
create index orders_session_id_idx on public.orders(session_id);
create index orders_status_created_at_idx on public.orders(status, created_at desc);
create index order_items_order_id_idx on public.order_items(order_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger restaurant_tables_updated_at before update on public.restaurant_tables for each row execute function public.set_updated_at();
create trigger table_sessions_updated_at before update on public.table_sessions for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger staff_profiles_updated_at before update on public.staff_profiles for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles
    where user_id = (select auth.uid()) and active = true
  );
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.staff_profiles enable row level security;

revoke all on table public.categories, public.products, public.restaurant_tables,
  public.table_sessions, public.orders, public.order_items, public.staff_profiles from anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant select on public.categories, public.products, public.restaurant_tables, public.table_sessions,
  public.orders, public.order_items, public.staff_profiles to authenticated;

create policy categories_public_read on public.categories for select to anon, authenticated
  using (active = true or (select public.is_staff()));
create policy products_public_read on public.products for select to anon, authenticated
  using (active = true or (select public.is_staff()));
create policy tables_staff_read on public.restaurant_tables for select to authenticated
  using ((select public.is_staff()));
create policy sessions_staff_read on public.table_sessions for select to authenticated
  using ((select public.is_staff()));
create policy orders_staff_read on public.orders for select to authenticated
  using ((select public.is_staff()));
create policy order_items_staff_read on public.order_items for select to authenticated
  using ((select public.is_staff()));
create policy staff_profile_self_read on public.staff_profiles for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.restaurant_tables;
  alter publication supabase_realtime add table public.table_sessions;
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

create or replace function public.broadcast_order_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.broadcast_changes(
    'order:' || coalesce(new.tracking_token, old.tracking_token)::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return coalesce(new, old);
end;
$$;

create trigger orders_broadcast_change
after insert or update or delete on public.orders
for each row execute function public.broadcast_order_change();

revoke all on function public.broadcast_order_change() from public, anon, authenticated;
