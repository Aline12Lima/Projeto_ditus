create or replace function public.broadcast_order_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_order public.orders;
begin
  changed_order := coalesce(new, old);
  perform realtime.send(
    jsonb_build_object(
      'order_id', changed_order.id,
      'status', changed_order.status
    ),
    tg_op,
    'order:' || changed_order.tracking_token::text,
    false
  );
  return changed_order;
end;
$$;

revoke all on function public.broadcast_order_change() from public, anon, authenticated;
