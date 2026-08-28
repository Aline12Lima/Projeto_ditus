create type public.customer_visit_status as enum ('AGUARDANDO_MESA','MESA_ASSOCIADA','ENCERRADA','CANCELADA');

create table public.customer_visits (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 80),
  token_hash bytea not null,
  tracking_token uuid not null default gen_random_uuid() unique,
  status public.customer_visit_status not null default 'AGUARDANDO_MESA',
  table_session_id uuid unique references public.table_sessions(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(), assigned_at timestamptz, closed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((status='AGUARDANDO_MESA' and table_session_id is null and assigned_at is null) or
    (status='MESA_ASSOCIADA' and table_session_id is not null and assigned_at is not null and closed_at is null) or
    (status in ('ENCERRADA','CANCELADA') and closed_at is not null))
);
alter table public.table_sessions add column customer_visit_id uuid unique references public.customer_visits(id) on update cascade on delete restrict;
create index customer_visits_status_created_idx on public.customer_visits(status,created_at);
create unique index one_active_visit_per_customer_token on public.customer_visits(token_hash) where status in ('AGUARDANDO_MESA','MESA_ASSOCIADA');
create trigger customer_visits_updated_at before update on public.customer_visits for each row execute function public.set_updated_at();
alter table public.customer_visits enable row level security;
revoke all on public.customer_visits from anon,authenticated;
grant select on public.customer_visits to authenticated;
create policy customer_visits_staff_read on public.customer_visits for select to authenticated using ((select public.is_staff()));

create or replace function public.hash_customer_token(requested_token uuid) returns bytea
language sql immutable set search_path='' as $$ select extensions.digest(pg_catalog.convert_to(requested_token::text,'UTF8'),'sha256') $$;
revoke all on function public.hash_customer_token(uuid) from public,anon,authenticated;
grant execute on function public.hash_customer_token(uuid) to service_role;

create or replace function public.create_customer_visit(requested_customer_name text,requested_token uuid)
returns table(visit_id uuid,visit_status text,tracking_token uuid,table_number smallint)
language plpgsql security definer set search_path='' as $$
declare current_visit public.customer_visits%rowtype;
begin
 if requested_token is null then raise exception 'CUSTOMER_TOKEN_REQUIRED'; end if;
 if requested_customer_name is null or char_length(trim(requested_customer_name)) not between 2 and 80 then raise exception 'INVALID_CUSTOMER_NAME'; end if;
 select * into current_visit from public.customer_visits where token_hash=public.hash_customer_token(requested_token) and status in ('AGUARDANDO_MESA','MESA_ASSOCIADA') for update;
 if not found then insert into public.customer_visits(customer_name,token_hash) values(trim(requested_customer_name),public.hash_customer_token(requested_token)) returning * into current_visit;
 end if;
 return query select current_visit.id,current_visit.status::text,current_visit.tracking_token,
  (select t.number from public.table_sessions s join public.restaurant_tables t on t.id=s.table_id where s.id=current_visit.table_session_id);
end $$;

create or replace function public.get_customer_visit(requested_token uuid)
returns table(visit_id uuid,customer_name text,visit_status text,tracking_token uuid,table_number smallint)
language sql stable security definer set search_path='' as $$
 select v.id,v.customer_name,v.status::text,v.tracking_token,t.number from public.customer_visits v
 left join public.table_sessions s on s.id=v.table_session_id left join public.restaurant_tables t on t.id=s.table_id
 where v.token_hash=public.hash_customer_token(requested_token) and v.status in ('AGUARDANDO_MESA','MESA_ASSOCIADA') limit 1
$$;

create or replace function public.assign_customer_visit(requested_visit_id uuid,requested_table_number smallint)
returns table(visit_id uuid,session_id uuid,table_number smallint)
language plpgsql security definer set search_path='' as $$
declare target_visit public.customer_visits%rowtype; target_table public.restaurant_tables%rowtype; created_session public.table_sessions%rowtype;
begin
 select * into target_visit from public.customer_visits where id=requested_visit_id for update;
 if not found then raise exception 'VISIT_NOT_FOUND'; end if;
 if target_visit.status<>'AGUARDANDO_MESA' then raise exception 'VISIT_NOT_WAITING'; end if;
 select * into target_table from public.restaurant_tables where number=requested_table_number for update;
 if not found then raise exception 'TABLE_NOT_FOUND'; end if;
 if target_table.status<>'LIVRE' or exists(select 1 from public.table_sessions where table_id=target_table.id and status='ABERTA') then raise exception 'TABLE_NOT_FREE'; end if;
 insert into public.table_sessions(table_id,customer_name,customer_visit_id) values(target_table.id,target_visit.customer_name,target_visit.id) returning * into created_session;
 update public.customer_visits set status='MESA_ASSOCIADA',table_session_id=created_session.id,assigned_at=now() where id=target_visit.id;
 update public.restaurant_tables set status='OCUPADA' where id=target_table.id;
 return query select target_visit.id,created_session.id,target_table.number;
end $$;

create or replace function public.create_customer_order(requested_customer_name text,requested_customer_token uuid,requested_items jsonb,requested_notes text,requested_idempotency_key uuid)
returns table(order_id bigint,session_id uuid,order_total numeric,tracking_token uuid,table_number smallint)
language plpgsql security definer set search_path='' as $$
declare target_visit public.customer_visits%rowtype; target_session public.table_sessions%rowtype; target_table public.restaurant_tables%rowtype; created_order_id bigint; calculated_total numeric(12,2);
begin
 if requested_idempotency_key is null then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
 if requested_notes is null or char_length(requested_notes)>1000 then raise exception 'INVALID_NOTES'; end if;
 if jsonb_typeof(requested_items)<>'array' or jsonb_array_length(requested_items)=0 then raise exception 'EMPTY_ORDER'; end if;
 select * into target_visit from public.customer_visits where token_hash=public.hash_customer_token(requested_customer_token) and status='MESA_ASSOCIADA' for update;
 if not found then
  if exists(select 1 from public.customer_visits where token_hash=public.hash_customer_token(requested_customer_token) and status='AGUARDANDO_MESA') then raise exception 'CUSTOMER_AWAITING_TABLE'; end if;
  raise exception 'VISIT_NOT_FOUND';
 end if;
 if target_visit.status<>'MESA_ASSOCIADA' or target_visit.table_session_id is null then raise exception 'CUSTOMER_AWAITING_TABLE'; end if;
 select * into target_session from public.table_sessions where id=target_visit.table_session_id and customer_visit_id=target_visit.id and status='ABERTA' for update;
 if not found then raise exception 'SESSION_NOT_OPEN'; end if;
 select * into target_table from public.restaurant_tables where id=target_session.table_id for update;
 if exists(select 1 from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer) where i.product_id is null or i.quantity is null or i.quantity<=0 or i.quantity>99) then raise exception 'INVALID_ITEM'; end if;
 if (select count(*) from (select distinct i.product_id from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer)) x)<>(select count(*) from public.products p where p.id in(select distinct i.product_id from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer)) and p.active) then raise exception 'PRODUCT_NOT_FOUND_OR_INACTIVE'; end if;
 select coalesce(sum(p.price*r.quantity),0) into calculated_total from (select i.product_id,sum(i.quantity)::integer quantity from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer) group by i.product_id) r join public.products p on p.id=r.product_id and p.active;
 insert into public.orders(session_id,notes,total,idempotency_key) values(target_session.id,requested_notes,calculated_total,requested_idempotency_key) on conflict(idempotency_key) do nothing returning id into created_order_id;
 if created_order_id is null then select id,total into created_order_id,calculated_total from public.orders where idempotency_key=requested_idempotency_key;
 else insert into public.order_items(order_id,product_id,product_name,unit_price,quantity) select created_order_id,p.id,p.name_translations->>'pt',p.price,r.quantity from (select i.product_id,sum(i.quantity)::integer quantity from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer) group by i.product_id) r join public.products p on p.id=r.product_id; end if;
 return query select created_order_id,target_session.id,calculated_total,(select o.tracking_token from public.orders o where o.id=created_order_id),target_table.number;
end $$;

create or replace function public.broadcast_customer_visit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin perform realtime.send(jsonb_build_object('status',new.status,'table_number',(select t.number from public.table_sessions s join public.restaurant_tables t on t.id=s.table_id where s.id=new.table_session_id)),tg_op,'customer-visit:'||new.tracking_token::text,false); return new; end $$;
create trigger customer_visits_broadcast_change after insert or update on public.customer_visits for each row execute function public.broadcast_customer_visit_change();
revoke all on function public.broadcast_customer_visit_change() from public,anon,authenticated;

create or replace function public.transition_order_status(requested_order_id bigint,requested_status public.order_status)
returns public.orders language plpgsql security definer set search_path='' as $$
declare current_order public.orders%rowtype; current_session public.table_sessions%rowtype; updated_order public.orders%rowtype;
begin
 select * into current_order from public.orders where id=requested_order_id for update; if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if not(case current_order.status when 'RECEBIDO' then requested_status in ('EM_PREPARO','CANCELADO') when 'EM_PREPARO' then requested_status in ('PRONTO','CANCELADO') when 'PRONTO' then requested_status='ENTREGUE' when 'ENTREGUE' then requested_status='AGUARDANDO_PAGAMENTO' when 'AGUARDANDO_PAGAMENTO' then requested_status='PAGO' else false end) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 update public.orders set status=requested_status,paid_at=case when requested_status='PAGO' then now() else paid_at end,cancelled_at=case when requested_status='CANCELADO' then now() else cancelled_at end where id=requested_order_id returning * into updated_order;
 select * into current_session from public.table_sessions where id=current_order.session_id for update;
 if requested_status='AGUARDANDO_PAGAMENTO' then update public.restaurant_tables set status='AGUARDANDO_PAGAMENTO' where id=current_session.table_id;
 elsif requested_status in ('PAGO','CANCELADO') and not exists(select 1 from public.orders where session_id=current_session.id and id<>requested_order_id and status not in ('PAGO','CANCELADO')) then
  update public.table_sessions set status='ENCERRADA',closed_at=now() where id=current_session.id;
  update public.restaurant_tables set status='LIVRE' where id=current_session.table_id;
  update public.customer_visits set status='ENCERRADA',closed_at=now() where id=current_session.customer_visit_id and status='MESA_ASSOCIADA';
 end if; return updated_order;
end $$;

revoke all on function public.create_customer_visit(text,uuid),public.get_customer_visit(uuid),public.assign_customer_visit(uuid,smallint) from public,anon,authenticated;
grant execute on function public.create_customer_visit(text,uuid),public.get_customer_visit(uuid),public.assign_customer_visit(uuid,smallint) to service_role;
do $$ begin alter publication supabase_realtime add table public.customer_visits; exception when duplicate_object then null; end $$;
notify pgrst,'reload schema';
