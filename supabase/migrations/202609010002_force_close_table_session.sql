create or replace function public.force_close_table_session(
  requested_table_number smallint,
  requested_admin_id uuid
)
returns table(table_number smallint, session_id uuid, cancelled_orders integer, table_status public.table_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_table public.restaurant_tables%rowtype;
  target_session public.table_sessions%rowtype;
  cancelled_count integer := 0;
begin
  if not exists (
    select 1 from public.staff_profiles
    where user_id = requested_admin_id and active = true and role = 'ADMIN'
  ) then raise exception 'ADMIN_REQUIRED'; end if;

  select * into target_table
  from public.restaurant_tables
  where number = requested_table_number
  for update;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;

  select * into target_session
  from public.table_sessions
  where table_id = target_table.id and status = 'ABERTA'
  for update;

  if not found then
    if target_table.status <> 'LIVRE' then
      update public.restaurant_tables set status = 'LIVRE' where id = target_table.id;
    end if;
    return query select target_table.number, null::uuid, 0, 'LIVRE'::public.table_status;
    return;
  end if;

  perform 1 from public.orders
  where orders.session_id = target_session.id and status not in ('PAGO', 'CANCELADO')
  for update;

  update public.orders
  set status = 'CANCELADO', cancelled_at = coalesce(cancelled_at, now())
  where orders.session_id = target_session.id and status not in ('PAGO', 'CANCELADO');
  get diagnostics cancelled_count = row_count;

  update public.payment_requests payment
  set status = 'CANCELLED', cancelled_at = coalesce(cancelled_at, now())
  where payment.order_id in (select id from public.orders where orders.session_id = target_session.id and status = 'CANCELADO')
    and payment.status not in ('CONFIRMED', 'CANCELLED');

  update public.customer_visits
  set status = 'ENCERRADA', closed_at = coalesce(closed_at, now())
  where id = target_session.customer_visit_id and status in ('AGUARDANDO_MESA', 'MESA_ASSOCIADA');

  update public.table_sessions
  set status = 'ENCERRADA', closed_at = coalesce(closed_at, now())
  where id = target_session.id;

  update public.restaurant_tables set status = 'LIVRE' where id = target_table.id;

  return query select target_table.number, target_session.id, cancelled_count, 'LIVRE'::public.table_status;
end;
$$;

revoke all on function public.force_close_table_session(smallint, uuid) from public, anon, authenticated;
grant execute on function public.force_close_table_session(smallint, uuid) to service_role;
notify pgrst, 'reload schema';
