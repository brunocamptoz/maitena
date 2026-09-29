-- =====================================================================
-- MAITENA JOYAS · Migración inicial (esquema, seguridad y stock)
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → New query → pegar todo → Run.
-- Es idempotente: si se ejecuta dos veces no duplica nada.
--
-- Modelo de seguridad
--   · Público (rol anon): solo LEE productos publicados y sus fotos, con columnas limitadas
--     (no ve el stock real ni las reservas). No puede escribir nada ni ejecutar funciones.
--   · Administrador (rol authenticated + fila en admin_users): gestiona catálogo, ajustes
--     y envíos; lee pedidos; edita en un pedido solo campos que no son financieros.
--   · Servidor (rol service_role): el único que crea pedidos, registra pagos y mueve stock,
--     y siempre a través de las funciones de este archivo.
--
-- Modelo de stock (definido en las funciones de más abajo)
--   1. Al crear el pedido se RESERVA stock de forma atómica (bloqueo de filas): dos personas
--      no pueden llevarse la última unidad. La reserva dura `reservation_minutes` (30 por defecto).
--   2. Pago aprobado (confirmado por el webhook)  → la reserva se convierte en venta (stock baja).
--   3. Pago pendiente de acreditación             → la reserva se extiende 24 h.
--   4. Pago rechazado / abandonado                → la reserva vence y el stock vuelve a estar
--                                                   disponible (pg_cron cada 5 min + limpieza al
--                                                   crear cada pedido nuevo).
--   5. Pago aprobado después de vencer la reserva → se intenta tomar stock; si ya se vendió,
--                                                   el pedido queda marcado "requiere atención".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Permisos base: nada queda expuesto por defecto
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.product_category as enum ('anillos', 'pulseras', 'cadenas', 'aros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('awaiting_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_status as enum ('none', 'reserved', 'committed', 'released', 'shortfall');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- Quién es administrador. Se agrega a mano (ver supabase/README.md); nadie puede auto-asignarse.
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Los 19 departamentos de Uruguay (los envíos son solo dentro del país).
create table if not exists public.departments (
  name       text primary key,
  sort_order smallint not null unique
);

insert into public.departments (name, sort_order) values
  ('Artigas', 1), ('Canelones', 2), ('Cerro Largo', 3), ('Colonia', 4), ('Durazno', 5),
  ('Flores', 6), ('Florida', 7), ('Lavalleja', 8), ('Maldonado', 9), ('Montevideo', 10),
  ('Paysandú', 11), ('Río Negro', 12), ('Rivera', 13), ('Rocha', 14), ('Salto', 15),
  ('San José', 16), ('Soriano', 17), ('Tacuarembó', 18), ('Treinta y Tres', 19)
on conflict (name) do nothing;

-- Ajustes de la tienda: una sola fila. Los costos de envío NO están inventados:
-- hasta que el administrador los configure (shipping_configured = false) el checkout no debe cobrar envío.
create table if not exists public.store_settings (
  id                    boolean primary key default true check (id),
  shipping_default_cost integer not null default 0 check (shipping_default_cost >= 0),
  free_shipping_from    integer check (free_shipping_from is null or free_shipping_from > 0),
  shipping_configured   boolean not null default false,
  reservation_minutes   integer not null default 30 check (reservation_minutes between 5 and 1440),
  updated_at            timestamptz not null default now()
);

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

-- Costo de envío por departamento (si no hay fila, se usa shipping_default_cost).
create table if not exists public.shipping_rates (
  department text primary key references public.departments (name),
  cost       integer not null check (cost >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(btrim(name)) between 1 and 120),
  slug           text not null unique
                 check (char_length(slug) <= 140 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description    text not null default '' check (char_length(description) <= 5000),
  -- Pesos uruguayos, enteros.
  price          integer not null check (price >= 0 and price <= 10000000),
  category       public.product_category not null,
  -- Unidades físicas aún no vendidas / unidades reservadas por checkouts en curso.
  stock          integer not null default 0 check (stock >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0),
  -- Lo único que ve el público: nunca el stock real.
  available_stock integer generated always as (greatest(stock - stock_reserved, 0)) stored,
  active         boolean not null default true,
  is_demo        boolean not null default false,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_public_idx
  on public.products (category, created_at desc) where active and archived_at is null;

create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  image_url    text not null check (char_length(image_url) between 1 and 2048),
  -- Ruta dentro del bucket product-images (null para imágenes que no viven en Storage).
  storage_path text,
  alt          text not null default '' check (char_length(alt) <= 200),
  -- 0 = fotografía principal. Se puede reordenar dentro de una transacción.
  position     integer not null default 0 check (position >= 0),
  created_at   timestamptz not null default now(),
  constraint product_images_position_key unique (product_id, position) deferrable initially deferred
);

create index if not exists product_images_product_idx on public.product_images (product_id, position);

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  integer generated always as identity (start with 1001) unique,
  -- Enlace secreto para que el comprador (sin cuenta) vea el estado de su pedido.
  public_token  uuid not null unique default gen_random_uuid(),

  customer_name      text not null check (char_length(btrim(customer_name)) between 1 and 80),
  customer_last_name text not null check (char_length(btrim(customer_last_name)) between 1 and 80),
  customer_email     text not null
                     check (char_length(customer_email) <= 254 and customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone     text not null check (char_length(btrim(customer_phone)) between 6 and 30),

  shipping_department  text not null references public.departments (name),
  shipping_city        text not null check (char_length(btrim(shipping_city)) between 1 and 80),
  shipping_address     text not null check (char_length(btrim(shipping_address)) between 1 and 120),
  shipping_door_number text not null check (char_length(btrim(shipping_door_number)) between 1 and 20),
  shipping_apartment   text check (char_length(shipping_apartment) <= 40),
  shipping_postal_code text check (char_length(shipping_postal_code) <= 10),
  shipping_notes       text check (char_length(shipping_notes) <= 500),

  subtotal      integer not null check (subtotal >= 0),
  shipping_cost integer not null check (shipping_cost >= 0),
  total         integer not null,
  constraint orders_total_check check (total = subtotal + shipping_cost),

  payment_status public.payment_status not null default 'pending',
  order_status   public.order_status   not null default 'awaiting_payment',
  stock_status   public.stock_status   not null default 'none',
  reserved_until timestamptz,

  -- Referencia de Mercado Pago (la preferencia de pago que se generó para este pedido).
  payment_preference_id text,

  paid_at      timestamptz,
  shipped_at   timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,

  tracking_company text check (char_length(tracking_company) <= 80),
  tracking_number  text check (char_length(tracking_number) <= 80),
  tracking_url     text check (char_length(tracking_url) <= 500),

  -- Marcas para no enviar emails duplicados (ver claim_order_email).
  confirmation_email_sent_at timestamptz,
  admin_notified_at          timestamptz,
  shipping_email_sent_at     timestamptz,

  -- Pedidos que necesitan que el administrador los revise (pago repetido, monto distinto, etc.).
  needs_attention boolean not null default false,
  attention_reason text,
  admin_notes      text check (char_length(admin_notes) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (order_status, created_at desc);
create index if not exists orders_email_idx on public.orders (lower(customer_email));
create index if not exists orders_reserved_idx on public.orders (reserved_until) where stock_status = 'reserved';

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  -- Un producto vendido no se puede borrar: se archiva.
  product_id   uuid not null references public.products (id) on delete restrict,
  -- Copias del momento de la compra: el pedido no cambia si después se edita el producto.
  product_name text not null,
  quantity     integer not null check (quantity between 1 and 99),
  unit_price   integer not null check (unit_price >= 0),
  subtotal     integer generated always as (quantity * unit_price) stored,
  created_at   timestamptz not null default now(),
  constraint order_items_order_product_key unique (order_id, product_id)
);

create index if not exists order_items_product_idx on public.order_items (product_id);

-- Pagos de Mercado Pago. Nunca se guardan datos de tarjeta: solo referencias.
create table if not exists public.payments (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders (id) on delete restrict,
  provider               text not null default 'mercadopago',
  provider_payment_id    text,
  status                 public.payment_status not null default 'pending',
  provider_status        text,
  provider_status_detail text,
  amount                 numeric(12, 2) not null check (amount >= 0),
  currency               text not null default 'UYU',
  payment_method         text,
  -- Solo metadatos de referencia estrictamente necesarios (con tope de tamaño).
  raw                    jsonb not null default '{}'::jsonb check (pg_column_size(raw) < 8192),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint payments_provider_payment_key unique (provider, provider_payment_id)
);

create index if not exists payments_order_idx on public.payments (order_id);

-- Historial de cada pedido (creación, pagos, stock, emails, cambios de estado).
create table if not exists public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  type       text not null,
  detail     jsonb not null default '{}'::jsonb,
  actor      uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------
-- 3. Funciones auxiliares y triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ¿El usuario de la sesión actual es administrador?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array['products', 'orders', 'payments', 'store_settings', 'shipping_rates'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;

-- Invariantes de pedidos: sin pago aprobado no hay preparación/envío, y se sellan las fechas.
create or replace function public.orders_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_status is distinct from old.order_status then
    if new.order_status in ('paid', 'preparing', 'shipped', 'delivered')
       and new.payment_status <> 'approved' then
      raise exception 'order_not_paid' using errcode = 'P0001';
    end if;
    if new.order_status = 'paid' and new.paid_at is null then new.paid_at := now(); end if;
    if new.order_status = 'shipped' and new.shipped_at is null then new.shipped_at := now(); end if;
    if new.order_status = 'delivered' and new.delivered_at is null then new.delivered_at := now(); end if;
    if new.order_status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_before_update on public.orders;
create trigger orders_before_update
  before update on public.orders
  for each row execute function public.orders_before_update();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------
alter table public.admin_users    enable row level security;
alter table public.departments    enable row level security;
alter table public.store_settings enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.payments       enable row level security;
alter table public.order_events   enable row level security;

-- admin_users: cada admin ve solo su propia fila (no hay políticas de escritura).
drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- Tablas de configuración: solo administradores.
drop policy if exists departments_admin_read on public.departments;
create policy departments_admin_read on public.departments
  for select to authenticated using (public.is_admin());

drop policy if exists store_settings_admin_read on public.store_settings;
create policy store_settings_admin_read on public.store_settings
  for select to authenticated using (public.is_admin());

drop policy if exists store_settings_admin_update on public.store_settings;
create policy store_settings_admin_update on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists shipping_rates_admin_all on public.shipping_rates;
create policy shipping_rates_admin_all on public.shipping_rates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Catálogo: el público ve solo lo publicado; el admin ve y gestiona todo.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (active and archived_at is null);

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
     where p.id = product_images.product_id and p.active and p.archived_at is null
  ));

drop policy if exists product_images_admin_all on public.product_images;
create policy product_images_admin_all on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos y pagos: solo lectura para el admin. Todo lo demás lo hace el servidor (service_role).
drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items
  for select to authenticated using (public.is_admin());

drop policy if exists payments_admin_read on public.payments;
create policy payments_admin_read on public.payments
  for select to authenticated using (public.is_admin());

drop policy if exists order_events_admin_read on public.order_events;
create policy order_events_admin_read on public.order_events
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Permisos por tabla y por columna (mínimo privilegio)
-- ---------------------------------------------------------------------
revoke all on
  public.admin_users, public.departments, public.store_settings, public.shipping_rates,
  public.products, public.product_images, public.orders, public.order_items,
  public.payments, public.order_events
from anon, authenticated;

-- Público: solo columnas seguras. El stock real y las reservas NO se pueden leer.
grant select (id, slug, name, description, price, category, available_stock, active, archived_at, is_demo, created_at)
  on public.products to anon;
grant select (id, product_id, image_url, alt, position)
  on public.product_images to anon;

-- Administrador.
grant select on public.admin_users to authenticated;
grant select on public.departments to authenticated;
grant select on public.store_settings to authenticated;
grant update (shipping_default_cost, free_shipping_from, shipping_configured, reservation_minutes)
  on public.store_settings to authenticated;
grant select, insert, update, delete on public.shipping_rates to authenticated;

grant select on public.products to authenticated;
grant insert (name, slug, description, price, category, stock, active) on public.products to authenticated;
-- stock_reserved queda fuera a propósito: solo lo mueven las funciones de reserva.
grant update (name, slug, description, price, category, stock, active, archived_at)
  on public.products to authenticated;
grant delete on public.products to authenticated;

grant select, insert, update, delete on public.product_images to authenticated;

grant select on public.orders, public.order_items, public.payments, public.order_events to authenticated;
-- En un pedido el admin puede corregir datos de envío y anotar; nunca montos, pagos ni estados
-- (los estados cambian solo mediante funciones del servidor).
grant update (
  customer_phone, shipping_department, shipping_city, shipping_address, shipping_door_number,
  shipping_apartment, shipping_postal_code, shipping_notes, admin_notes, needs_attention, attention_reason
) on public.orders to authenticated;

-- Servidor.
grant select, insert, update, delete on all tables in schema public to service_role;

-- ---------------------------------------------------------------------
-- 6. Stock y pedidos (solo ejecutables por el servidor)
-- ---------------------------------------------------------------------

-- Devuelve al stock disponible lo reservado por un pedido (y lo cancela si estaba esperando el pago).
create or replace function public.release_order_stock(p_order_id uuid, p_reason text default null)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item  record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.stock_status <> 'reserved' then
    return false;
  end if;

  -- Siempre en orden de producto para no generar bloqueos cruzados entre pedidos.
  for v_item in
    select product_id, quantity from public.order_items where order_id = p_order_id order by product_id
  loop
    update public.products
       set stock_reserved = greatest(stock_reserved - v_item.quantity, 0)
     where id = v_item.product_id;
  end loop;

  -- Ojo: en un UPDATE todos los CASE leen los valores ANTERIORES de la fila.
  update public.orders
     set stock_status   = 'released',
         reserved_until = null,
         order_status   = case when order_status = 'awaiting_payment' then 'cancelled' else order_status end,
         cancel_reason  = case when order_status = 'awaiting_payment'
                               then coalesce(p_reason, 'released') else cancel_reason end,
         payment_status = case when order_status = 'awaiting_payment' and payment_status = 'pending'
                               then 'cancelled' else payment_status end
   where id = p_order_id;

  insert into public.order_events (order_id, type, detail)
  values (p_order_id, 'stock_released', jsonb_build_object('reason', p_reason));

  return true;
end;
$$;

-- Libera todas las reservas vencidas. Corre por pg_cron cada 5 minutos y antes de cada pedido nuevo.
create or replace function public.release_expired_reservations()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_id    uuid;
  v_count integer := 0;
begin
  for v_id in
    select id
      from public.orders
     where stock_status = 'reserved'
       and reserved_until is not null
       and reserved_until < now()
     order by reserved_until
     limit 200
       for update skip locked
  loop
    if public.release_order_stock(v_id, 'expired') then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Crea un pedido y reserva su stock en UNA sola transacción.
-- El cliente NUNCA envía precios: se leen de la base. p_customer y p_items vienen validados
-- por el servidor (Zod); acá se vuelven a validar las reglas críticas.
--   p_customer: { name, last_name, email, phone, department, city, address, door_number,
--                 apartment?, postal_code?, notes? }
--   p_items:    [ { product_id, quantity }, ... ]
-- Errores (message): invalid_items, invalid_quantity, invalid_department, product_unavailable,
--                    insufficient_stock (details = id del producto, hint = unidades disponibles).
create or replace function public.create_order(p_customer jsonb, p_items jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_settings   public.store_settings%rowtype;
  v_department text := btrim(p_customer ->> 'department');
  v_order      public.orders%rowtype;
  v_line       record;
  v_subtotal   integer := 0;
  v_shipping   integer;
  v_rate       integer;
  v_items      jsonb := '[]'::jsonb;
  v_missing    uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.departments where name = v_department) then
    raise exception 'invalid_department' using errcode = 'P0001';
  end if;

  -- Libera reservas vencidas para que su stock cuente como disponible.
  perform public.release_expired_reservations();

  select * into v_settings from public.store_settings where id;

  -- ¿Algún producto no existe, está oculto o archivado?
  select x.product_id into v_missing
    from (select distinct (e ->> 'product_id')::uuid as product_id from jsonb_array_elements(p_items) e) x
   where not exists (
     select 1 from public.products p
      where p.id = x.product_id and p.active and p.archived_at is null
   )
   limit 1;
  if found then
    raise exception 'product_unavailable' using errcode = 'P0001', detail = v_missing::text;
  end if;

  -- Bloquea las filas de producto (en orden de id, sin bloqueos cruzados), valida y reserva.
  for v_line in
    with req as (
      select x.product_id, sum(x.quantity)::integer as quantity
        from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
       group by x.product_id
    )
    select p.id, p.name, p.price, p.stock, p.stock_reserved, req.quantity
      from req
      join public.products p on p.id = req.product_id
     order by p.id
       for update of p
  loop
    if v_line.quantity < 1 or v_line.quantity > 99 then
      raise exception 'invalid_quantity' using errcode = 'P0001', detail = v_line.id::text;
    end if;

    if v_line.stock - v_line.stock_reserved < v_line.quantity then
      raise exception 'insufficient_stock' using
        errcode = 'P0001',
        detail  = v_line.id::text,
        hint    = greatest(v_line.stock - v_line.stock_reserved, 0)::text;
    end if;

    update public.products
       set stock_reserved = stock_reserved + v_line.quantity
     where id = v_line.id;

    v_subtotal := v_subtotal + v_line.price * v_line.quantity;
    v_items := v_items || jsonb_build_object(
      'product_id', v_line.id,
      'name',       v_line.name,
      'quantity',   v_line.quantity,
      'unit_price', v_line.price
    );
  end loop;

  -- Envío: tarifa del departamento o la general; gratis desde el monto configurado.
  select r.cost into v_rate from public.shipping_rates r where r.department = v_department;
  v_shipping := coalesce(v_rate, v_settings.shipping_default_cost);
  if v_settings.free_shipping_from is not null and v_subtotal >= v_settings.free_shipping_from then
    v_shipping := 0;
  end if;

  insert into public.orders (
    customer_name, customer_last_name, customer_email, customer_phone,
    shipping_department, shipping_city, shipping_address, shipping_door_number,
    shipping_apartment, shipping_postal_code, shipping_notes,
    subtotal, shipping_cost, total, stock_status, reserved_until
  ) values (
    btrim(p_customer ->> 'name'), btrim(p_customer ->> 'last_name'),
    lower(btrim(p_customer ->> 'email')), btrim(p_customer ->> 'phone'),
    v_department, btrim(p_customer ->> 'city'), btrim(p_customer ->> 'address'),
    btrim(p_customer ->> 'door_number'),
    nullif(btrim(p_customer ->> 'apartment'), ''), nullif(btrim(p_customer ->> 'postal_code'), ''),
    nullif(btrim(p_customer ->> 'notes'), ''),
    v_subtotal, v_shipping, v_subtotal + v_shipping, 'reserved',
    now() + make_interval(mins => v_settings.reservation_minutes)
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
  select v_order.id, (e ->> 'product_id')::uuid, e ->> 'name', (e ->> 'quantity')::integer, (e ->> 'unit_price')::integer
    from jsonb_array_elements(v_items) e;

  insert into public.order_events (order_id, type, detail)
  values (v_order.id, 'created', jsonb_build_object('total', v_order.total, 'items', jsonb_array_length(v_items)));

  return jsonb_build_object(
    'order_id',       v_order.id,
    'order_number',   v_order.order_number,
    'public_token',   v_order.public_token,
    'subtotal',       v_order.subtotal,
    'shipping_cost',  v_order.shipping_cost,
    'total',          v_order.total,
    'reserved_until', v_order.reserved_until,
    'shipping_configured', v_settings.shipping_configured,
    'items',          v_items
  );
end;
$$;

-- Registra un pago de Mercado Pago (ya VERIFICADO contra la API de MP por el servidor) y actualiza
-- pedido y stock. Es idempotente: los reintentos del webhook no duplican nada.
-- Devuelve { became_paid, stock, needs_attention, attention_reason, order_status }.
-- became_paid = true solo la PRIMERA vez que el pedido se confirma → único momento de enviar emails.
create or replace function public.apply_payment(
  p_order_id              uuid,
  p_provider_payment_id   text,
  p_status                public.payment_status,
  p_provider_status       text,
  p_provider_status_detail text,
  p_amount                numeric,
  p_payment_method        text,
  p_raw                   jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order       public.orders%rowtype;
  v_prev_status public.payment_status;
  v_pay_id      uuid;
  v_inserted    boolean;
  v_item        record;
  v_became_paid boolean := false;
  v_attention   text;
  v_stock       text := 'unchanged';
  v_short       boolean := false;
  v_revive      boolean;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception 'invalid_payment_id' using errcode = 'P0001';
  end if;

  -- El bloqueo del pedido serializa webhooks concurrentes del mismo pago.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  select status into v_prev_status
    from public.payments
   where provider = 'mercadopago' and provider_payment_id = p_provider_payment_id;

  insert into public.payments as pay
    (order_id, provider, provider_payment_id, status, provider_status, provider_status_detail,
     amount, payment_method, raw)
  values
    (p_order_id, 'mercadopago', p_provider_payment_id, p_status, p_provider_status, p_provider_status_detail,
     p_amount, p_payment_method, coalesce(p_raw, '{}'::jsonb))
  on conflict (provider, provider_payment_id) do update
     set status                 = excluded.status,
         provider_status        = excluded.provider_status,
         provider_status_detail = excluded.provider_status_detail,
         amount                 = excluded.amount,
         payment_method         = excluded.payment_method,
         raw                    = excluded.raw
   where pay.order_id = excluded.order_id
  returning pay.id, (pay.xmax = 0) into v_pay_id, v_inserted;

  if v_pay_id is null then
    raise exception 'payment_belongs_to_another_order' using errcode = 'P0001';
  end if;

  if p_status = 'approved' then
    if v_order.payment_status = 'approved' then
      -- Otro pago aprobado distinto para el mismo pedido = cobro doble.
      if v_inserted then
        update public.orders
           set needs_attention = true, attention_reason = 'duplicate_payment'
         where id = p_order_id;
        v_attention := 'duplicate_payment';
      end if;

    elsif p_amount <> v_order.total then
      -- El monto cobrado no coincide con el pedido: no se confirma sola.
      update public.orders
         set needs_attention = true, attention_reason = 'amount_mismatch'
       where id = p_order_id;
      v_attention := 'amount_mismatch';

    else
      -- Un pedido que venció solo (sin pagar) se reactiva; uno cancelado a mano por el admin, no.
      v_revive := v_order.order_status = 'awaiting_payment'
               or (v_order.order_status = 'cancelled' and v_order.cancel_reason = 'expired');

      if v_order.order_status = 'cancelled' and not v_revive then
        update public.orders
           set payment_status = 'approved', paid_at = coalesce(paid_at, now()),
               needs_attention = true, attention_reason = 'paid_after_cancel'
         where id = p_order_id;
        v_attention := 'paid_after_cancel';
      else
        if v_order.stock_status = 'reserved' then
          -- Camino normal: la reserva se convierte en venta.
          for v_item in
            select product_id, quantity from public.order_items where order_id = p_order_id order by product_id
          loop
            update public.products
               set stock = stock - v_item.quantity, stock_reserved = stock_reserved - v_item.quantity
             where id = v_item.product_id
               and stock >= v_item.quantity and stock_reserved >= v_item.quantity;
            if not found then
              v_short := true;
              update public.products
                 set stock = greatest(stock - v_item.quantity, 0),
                     stock_reserved = greatest(stock_reserved - v_item.quantity, 0)
               where id = v_item.product_id;
            end if;
          end loop;

        elsif v_order.stock_status in ('released', 'none') then
          -- Pago tardío (la reserva ya venció): se intenta tomar stock directamente.
          for v_item in
            select product_id, quantity from public.order_items where order_id = p_order_id order by product_id
          loop
            update public.products
               set stock = stock - v_item.quantity
             where id = v_item.product_id
               and stock - stock_reserved >= v_item.quantity;
            if not found then
              v_short := true;
              update public.products
                 set stock = greatest(stock - v_item.quantity, 0)
               where id = v_item.product_id;
            end if;
          end loop;
        end if;

        update public.orders
           set payment_status  = 'approved',
               order_status    = case when order_status in ('awaiting_payment', 'cancelled')
                                      then 'paid' else order_status end,
               stock_status    = case when stock_status in ('reserved', 'released', 'none')
                                      then (case when v_short then 'shortfall' else 'committed' end)::public.stock_status
                                      else stock_status end,
               reserved_until  = null,
               paid_at         = coalesce(paid_at, now()),
               cancelled_at    = null,
               cancel_reason   = null,
               needs_attention = needs_attention or v_short,
               attention_reason = case when v_short then coalesce(attention_reason, 'stock_shortfall')
                                       else attention_reason end
         where id = p_order_id;

        v_became_paid := true;
        if v_order.stock_status in ('reserved', 'released', 'none') then
          v_stock := case when v_short then 'shortfall' else 'committed' end;
        end if;
        if v_short then v_attention := 'stock_shortfall'; end if;
      end if;
    end if;

  elsif p_status = 'refunded' then
    if not exists (
      select 1 from public.payments where order_id = p_order_id and status = 'approved'
    ) then
      update public.orders
         set payment_status = 'refunded', needs_attention = true,
             attention_reason = coalesce(attention_reason, 'payment_refunded')
       where id = p_order_id;
      v_attention := 'payment_refunded';
    end if;

  elsif p_status in ('rejected', 'cancelled') then
    -- El cliente puede reintentar con otra tarjeta dentro de la reserva: no se libera acá.
    if v_order.payment_status not in ('approved', 'refunded') then
      update public.orders set payment_status = p_status where id = p_order_id;
    end if;

  else
    -- Pendiente de acreditación: se extiende la reserva para no perder la venta.
    if v_order.payment_status not in ('approved', 'refunded') then
      update public.orders
         set payment_status = 'pending',
             reserved_until = case when stock_status = 'reserved'
                                   then greatest(coalesce(reserved_until, now()), now() + interval '24 hours')
                                   else reserved_until end
       where id = p_order_id;
    end if;
  end if;

  if v_prev_status is distinct from p_status or v_became_paid or v_attention is not null then
    insert into public.order_events (order_id, type, detail)
    values (p_order_id, 'payment_' || p_status::text, jsonb_build_object(
      'provider_payment_id', p_provider_payment_id,
      'provider_status', p_provider_status,
      'became_paid', v_became_paid,
      'attention', v_attention));
  end if;

  return jsonb_build_object(
    'became_paid',      v_became_paid,
    'stock',            v_stock,
    'needs_attention',  v_attention is not null,
    'attention_reason', v_attention,
    'order_status',     (select o.order_status from public.orders o where o.id = p_order_id)
  );
end;
$$;

-- Cancelación por el administrador. Con p_restock = true las unidades vuelven al stock.
-- El reembolso en Mercado Pago se hace a mano: el pedido queda marcado "refund_pending".
create or replace function public.cancel_order(
  p_order_id uuid,
  p_restock  boolean default true,
  p_reason   text default 'admin'
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item  record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.order_status = 'cancelled' then
    return false;
  end if;

  if v_order.stock_status = 'reserved' then
    perform public.release_order_stock(p_order_id, p_reason);
  elsif v_order.stock_status = 'committed' and p_restock then
    for v_item in
      select product_id, quantity from public.order_items where order_id = p_order_id order by product_id
    loop
      update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
    end loop;
    update public.orders set stock_status = 'released' where id = p_order_id;
  end if;

  update public.orders
     set order_status     = 'cancelled',
         cancel_reason    = p_reason,
         needs_attention  = case when payment_status = 'approved' then true else needs_attention end,
         attention_reason = case when payment_status = 'approved'
                                 then coalesce(attention_reason, 'refund_pending') else attention_reason end
   where id = p_order_id;

  insert into public.order_events (order_id, type, detail)
  values (p_order_id, 'cancelled', jsonb_build_object('reason', p_reason, 'restock', p_restock));

  return true;
end;
$$;

-- "Reclama" el envío de un email de un pedido de forma atómica: devuelve true a UN solo llamador,
-- así ni un reintento del webhook ni un doble clic del admin envían el mismo correo dos veces.
-- Si el envío falla, se libera con unclaim_order_email para poder reintentar.
create or replace function public.claim_order_email(p_order_id uuid, p_kind text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_kind = 'confirmation' then
    update public.orders set confirmation_email_sent_at = now()
     where id = p_order_id and confirmation_email_sent_at is null;
  elsif p_kind = 'admin' then
    update public.orders set admin_notified_at = now()
     where id = p_order_id and admin_notified_at is null;
  elsif p_kind = 'shipping' then
    update public.orders set shipping_email_sent_at = now()
     where id = p_order_id and shipping_email_sent_at is null;
  else
    raise exception 'invalid_email_kind' using errcode = 'P0001';
  end if;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

create or replace function public.unclaim_order_email(p_order_id uuid, p_kind text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_kind = 'confirmation' then
    update public.orders set confirmation_email_sent_at = null where id = p_order_id;
  elsif p_kind = 'admin' then
    update public.orders set admin_notified_at = null where id = p_order_id;
  elsif p_kind = 'shipping' then
    update public.orders set shipping_email_sent_at = null where id = p_order_id;
  else
    raise exception 'invalid_email_kind' using errcode = 'P0001';
  end if;
end;
$$;

-- Solo el servidor puede ejecutarlas.
revoke all on function public.release_order_stock(uuid, text) from public, anon, authenticated;
revoke all on function public.release_expired_reservations() from public, anon, authenticated;
revoke all on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.apply_payment(uuid, text, public.payment_status, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.cancel_order(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.claim_order_email(uuid, text) from public, anon, authenticated;
revoke all on function public.unclaim_order_email(uuid, text) from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.orders_before_update() from public, anon, authenticated;

grant execute on function public.release_order_stock(uuid, text) to service_role;
grant execute on function public.release_expired_reservations() to service_role;
grant execute on function public.create_order(jsonb, jsonb) to service_role;
grant execute on function public.apply_payment(uuid, text, public.payment_status, text, text, numeric, text, jsonb)
  to service_role;
grant execute on function public.cancel_order(uuid, boolean, text) to service_role;
grant execute on function public.claim_order_email(uuid, text) to service_role;
grant execute on function public.unclaim_order_email(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- 7. Almacenamiento de fotografías (Supabase Storage)
-- ---------------------------------------------------------------------
-- Bucket público de lectura (las fotos se sirven por CDN); solo administradores pueden escribir.
-- Solo imágenes rasterizadas y hasta 5 MB (SVG excluido a propósito: puede contener scripts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_admin_select on storage.objects;
create policy product_images_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------
-- 8. Limpieza automática de reservas vencidas (pg_cron, cada 5 minutos)
-- ---------------------------------------------------------------------
-- Si la extensión no se puede activar acá, actívala en Database → Extensions → pg_cron y volvé a ejecutar
-- este bloque. Aun sin cron, las reservas vencidas se liberan cada vez que se crea un pedido.
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule(
    'release-expired-reservations',
    '*/5 * * * *',
    $cron$select public.release_expired_reservations()$cron$
  );
exception when others then
  raise notice 'pg_cron no disponible (%): las reservas vencidas se liberarán al crear pedidos.', sqlerrm;
end $$;

-- Que la API vea las tablas y funciones nuevas de inmediato.
notify pgrst, 'reload schema';
