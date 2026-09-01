create or replace function public.create_order(
  requested_table_number smallint,
  requested_items jsonb,
  requested_notes text,
  requested_idempotency_key uuid
)
returns table (order_id bigint, session_id uuid, order_total numeric, tracking_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_table public.restaurant_tables%rowtype;
  target_session public.table_sessions%rowtype;
  created_order_id bigint;
  calculated_total numeric(12,2);
begin
  if requested_idempotency_key is null then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
  if requested_notes is null or char_length(requested_notes) > 1000 then raise exception 'INVALID_NOTES'; end if;
  if jsonb_typeof(requested_items) <> 'array' or jsonb_array_length(requested_items) = 0 then raise exception 'EMPTY_ORDER'; end if;

  select * into target_table from public.restaurant_tables
  where number = requested_table_number for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if target_table.status = 'AGUARDANDO_PAGAMENTO' then raise exception 'TABLE_AWAITING_PAYMENT'; end if;

  if exists (
    select 1 from jsonb_to_recordset(requested_items) as item(product_id uuid, quantity integer)
    where item.product_id is null or item.quantity is null or item.quantity <= 0 or item.quantity > 99
  ) then raise exception 'INVALID_ITEM'; end if;

  if (
    select count(*) from (
      select distinct item.product_id
      from jsonb_to_recordset(requested_items) as item(product_id uuid, quantity integer)
    ) requested
  ) <> (
    select count(*) from public.products product
    where product.id in (
      select distinct item.product_id
      from jsonb_to_recordset(requested_items) as item(product_id uuid, quantity integer)
    ) and product.active = true
  ) then raise exception 'PRODUCT_NOT_FOUND_OR_INACTIVE'; end if;

  select * into target_session from public.table_sessions
  where table_id = target_table.id and status = 'ABERTA' for update;
  if not found then
    insert into public.table_sessions(table_id) values (target_table.id) returning * into target_session;
  end if;

  select coalesce(sum(product.price * requested.quantity), 0)
  into calculated_total
  from (
    select item.product_id, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(requested_items) as item(product_id uuid, quantity integer)
    group by item.product_id
  ) requested
  join public.products product on product.id = requested.product_id and product.active = true;

  insert into public.orders(session_id, notes, total, idempotency_key)
  values (target_session.id, requested_notes, calculated_total, requested_idempotency_key)
  on conflict (idempotency_key) do nothing
  returning id into created_order_id;

  if created_order_id is null then
    select id, total into created_order_id, calculated_total
    from public.orders where idempotency_key = requested_idempotency_key;
  else
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity)
    select created_order_id, product.id, product.name_translations->>'pt', product.price, requested.quantity
    from (
      select item.product_id, sum(item.quantity)::integer as quantity
      from jsonb_to_recordset(requested_items) as item(product_id uuid, quantity integer)
      group by item.product_id
    ) requested
    join public.products product on product.id = requested.product_id;
  end if;

  update public.restaurant_tables set status = 'OCUPADA' where id = target_table.id;
  return query select created_order_id, target_session.id, calculated_total,
    (select orders.tracking_token from public.orders where orders.id = created_order_id);
end;
$$;

create or replace function public.transition_order_status(requested_order_id bigint, requested_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders%rowtype;
  current_session public.table_sessions%rowtype;
  updated_order public.orders%rowtype;
begin
  select * into current_order from public.orders where id = requested_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if not (case current_order.status
    when 'RECEBIDO' then requested_status = 'EM_PREPARO' or requested_status = 'CANCELADO'
    when 'EM_PREPARO' then requested_status = 'PRONTO' or requested_status = 'CANCELADO'
    when 'PRONTO' then requested_status = 'ENTREGUE'
    when 'ENTREGUE' then requested_status = 'AGUARDANDO_PAGAMENTO'
    when 'AGUARDANDO_PAGAMENTO' then requested_status = 'PAGO'
    else false
  end) then raise exception 'INVALID_STATUS_TRANSITION'; end if;

  update public.orders set
    status = requested_status,
    paid_at = case when requested_status = 'PAGO' then now() else paid_at end,
    cancelled_at = case when requested_status = 'CANCELADO' then now() else cancelled_at end
  where id = requested_order_id returning * into updated_order;

  select * into current_session from public.table_sessions where id = current_order.session_id for update;

  if requested_status = 'AGUARDANDO_PAGAMENTO' then
    update public.restaurant_tables set status = 'AGUARDANDO_PAGAMENTO' where id = current_session.table_id;
  elsif requested_status in ('PAGO', 'CANCELADO') and not exists (
    select 1 from public.orders
    where session_id = current_session.id and id <> requested_order_id and status not in ('PAGO', 'CANCELADO')
  ) then
    update public.table_sessions set status = 'ENCERRADA', closed_at = now() where id = current_session.id;
    update public.restaurant_tables set status = 'LIVRE' where id = current_session.table_id;
  end if;

  return updated_order;
end;
$$;

revoke all on function public.create_order(smallint, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.transition_order_status(bigint, public.order_status) from public, anon, authenticated;
grant execute on function public.create_order(smallint, jsonb, text, uuid) to service_role;
grant execute on function public.transition_order_status(bigint, public.order_status) to service_role;
