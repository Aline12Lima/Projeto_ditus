create type public.payment_method as enum ('PIX','CARTAO','DINHEIRO');
create type public.payment_status as enum ('REQUESTED','CUSTOMER_REPORTED','CONFIRMED','CANCELLED');

alter table public.restaurant_tables add column access_token_hash bytea;

create or replace function public.sync_table_access_token_hash()
returns trigger language plpgsql set search_path='' as $$
begin
  new.access_token_hash=extensions.digest(pg_catalog.convert_to(new.access_token::text,'UTF8'),'sha256');
  return new;
end $$;
create trigger restaurant_tables_access_token_hash before insert or update of access_token on public.restaurant_tables
for each row execute function public.sync_table_access_token_hash();
update public.restaurant_tables set access_token_hash=extensions.digest(pg_catalog.convert_to(access_token::text,'UTF8'),'sha256');
alter table public.restaurant_tables alter column access_token_hash set not null;
revoke all on function public.sync_table_access_token_hash() from public,anon,authenticated;

create or replace function public.validate_table_access(requested_table_number smallint,requested_access_token uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.restaurant_tables where number=requested_table_number
  and access_token_hash=extensions.digest(pg_catalog.convert_to(requested_access_token::text,'UTF8'),'sha256'))
$$;

create or replace function public.start_table_visit(requested_table_number smallint,requested_access_token uuid,requested_customer_name text,requested_customer_token uuid)
returns table(visit_id uuid,visit_status text,visit_tracking_token uuid,session_id uuid,table_number smallint)
language plpgsql security definer set search_path='' as $$
declare target_table public.restaurant_tables%rowtype; target_visit public.customer_visits%rowtype; target_session public.table_sessions%rowtype;
begin
 if requested_access_token is null or requested_customer_token is null then raise exception 'INVALID_TABLE_ACCESS'; end if;
 if requested_customer_name is null or char_length(trim(requested_customer_name)) not between 2 and 80 then raise exception 'INVALID_CUSTOMER_NAME'; end if;
 select * into target_table from public.restaurant_tables where number=requested_table_number for update;
 if not found or target_table.access_token_hash<>extensions.digest(pg_catalog.convert_to(requested_access_token::text,'UTF8'),'sha256') then raise exception 'INVALID_TABLE_ACCESS'; end if;
 select * into target_visit from public.customer_visits where token_hash=public.hash_customer_token(requested_customer_token) and status in ('AGUARDANDO_MESA','MESA_ASSOCIADA') for update;
 if found and target_visit.status='MESA_ASSOCIADA' then
  select * into target_session from public.table_sessions where id=target_visit.table_session_id and status='ABERTA' for update;
  if not found or target_session.table_id<>target_table.id then raise exception 'VISIT_ASSIGNED_TO_ANOTHER_TABLE'; end if;
  return query select target_visit.id,target_visit.status::text,target_visit.tracking_token,target_session.id,target_table.number; return;
 end if;
 select * into target_session from public.table_sessions where table_id=target_table.id and status='ABERTA' for update;
 if found then raise exception 'TABLE_OCCUPIED'; end if;
 if target_table.status<>'LIVRE' then raise exception 'TABLE_OCCUPIED'; end if;
 if not found and target_visit.id is null then
  insert into public.customer_visits(customer_name,token_hash) values(trim(requested_customer_name),public.hash_customer_token(requested_customer_token)) returning * into target_visit;
 end if;
 insert into public.table_sessions(table_id,customer_name,customer_visit_id) values(target_table.id,trim(requested_customer_name),target_visit.id) returning * into target_session;
 update public.customer_visits set customer_name=trim(requested_customer_name),status='MESA_ASSOCIADA',table_session_id=target_session.id,assigned_at=now() where id=target_visit.id returning * into target_visit;
 update public.restaurant_tables set status='OCUPADA' where id=target_table.id;
 return query select target_visit.id,target_visit.status::text,target_visit.tracking_token,target_session.id,target_table.number;
end $$;

create table public.payment_requests(
 id uuid primary key default gen_random_uuid(), order_id bigint not null unique references public.orders(id) on update cascade on delete restrict,
 method public.payment_method not null, status public.payment_status not null default 'REQUESTED', requested_at timestamptz not null default now(),
 customer_reported_at timestamptz, confirmed_at timestamptz, confirmed_by uuid references public.staff_profiles(user_id) on delete restrict,
 cancelled_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((status='REQUESTED' and customer_reported_at is null and confirmed_at is null and cancelled_at is null) or
  (status='CUSTOMER_REPORTED' and method='PIX' and customer_reported_at is not null and confirmed_at is null and cancelled_at is null) or
  (status='CONFIRMED' and confirmed_at is not null and confirmed_by is not null and cancelled_at is null) or
  (status='CANCELLED' and cancelled_at is not null and confirmed_at is null))
);
create index payment_requests_status_requested_idx on public.payment_requests(status,requested_at desc);
create trigger payment_requests_updated_at before update on public.payment_requests for each row execute function public.set_updated_at();
alter table public.payment_requests enable row level security;
revoke all on public.payment_requests from anon,authenticated;
grant select on public.payment_requests to authenticated;
create policy payment_requests_staff_read on public.payment_requests for select to authenticated using((select public.is_staff()));

create table public.order_reviews(
 id uuid primary key default gen_random_uuid(), order_id bigint not null unique references public.orders(id) on update cascade on delete restrict,
 customer_visit_id uuid references public.customer_visits(id) on update cascade on delete restrict,
 rating integer not null check(rating between 1 and 5), comment text check(comment is null or char_length(comment)<=1000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index order_reviews_created_idx on public.order_reviews(created_at desc);
create trigger order_reviews_updated_at before update on public.order_reviews for each row execute function public.set_updated_at();
alter table public.order_reviews enable row level security;
revoke all on public.order_reviews from anon,authenticated;
grant select on public.order_reviews to authenticated;
create policy order_reviews_staff_read on public.order_reviews for select to authenticated using((select public.is_staff()));

create or replace function public.revise_received_order(requested_order_id bigint,requested_items jsonb,requested_notes text)
returns public.orders language plpgsql security definer set search_path='' as $$
declare target_order public.orders%rowtype; calculated_total numeric(12,2);
begin
 select * into target_order from public.orders where id=requested_order_id for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if target_order.status<>'RECEBIDO' then raise exception 'ORDER_NOT_EDITABLE'; end if;
 if requested_notes is null or char_length(requested_notes)>1000 then raise exception 'INVALID_NOTES'; end if;
 if jsonb_typeof(requested_items)<>'array' or jsonb_array_length(requested_items)=0 then raise exception 'EMPTY_ORDER'; end if;
 if exists(select 1 from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer) where i.product_id is null or i.quantity is null or i.quantity<=0 or i.quantity>99) then raise exception 'INVALID_ITEM'; end if;
 if (select count(*) from (select distinct i.product_id from jsonb_to_recordset(requested_items)i(product_id uuid,quantity integer))x)<>(select count(*) from public.products p where p.active and p.id in(select distinct i.product_id from jsonb_to_recordset(requested_items)i(product_id uuid,quantity integer))) then raise exception 'PRODUCT_NOT_FOUND_OR_INACTIVE'; end if;
 select sum(p.price*r.quantity) into calculated_total from(select i.product_id,sum(i.quantity)::integer quantity from jsonb_to_recordset(requested_items)i(product_id uuid,quantity integer) group by i.product_id)r join public.products p on p.id=r.product_id and p.active;
 delete from public.order_items where order_id=requested_order_id;
 insert into public.order_items(order_id,product_id,product_name,unit_price,quantity) select requested_order_id,p.id,p.name_translations->>'pt',p.price,r.quantity from(select i.product_id,sum(i.quantity)::integer quantity from jsonb_to_recordset(requested_items)i(product_id uuid,quantity integer) group by i.product_id)r join public.products p on p.id=r.product_id;
 update public.orders set notes=requested_notes,total=calculated_total where id=requested_order_id returning * into target_order;
 return target_order;
end $$;

create or replace function public.request_order_payment(requested_order_id bigint,requested_tracking_token uuid,requested_method public.payment_method)
returns public.payment_requests language plpgsql security definer set search_path='' as $$
declare target_order public.orders%rowtype; result public.payment_requests%rowtype;
begin
 select * into target_order from public.orders where id=requested_order_id and tracking_token=requested_tracking_token for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if target_order.status not in('ENTREGUE','AGUARDANDO_PAGAMENTO') then raise exception 'PAYMENT_NOT_ALLOWED'; end if;
 insert into public.payment_requests(order_id,method) values(target_order.id,requested_method) on conflict(order_id) do nothing returning * into result;
 if result.id is null then select * into result from public.payment_requests where order_id=target_order.id; end if;
 if result.method<>requested_method or result.status='CANCELLED' then raise exception 'PAYMENT_ALREADY_REQUESTED'; end if;
 if target_order.status='ENTREGUE' then perform public.transition_order_status(target_order.id,'AGUARDANDO_PAGAMENTO'); end if;
 return result;
end $$;

create or replace function public.report_pix_payment(requested_order_id bigint,requested_tracking_token uuid)
returns public.payment_requests language plpgsql security definer set search_path='' as $$
declare result public.payment_requests%rowtype;
begin
 select p.* into result from public.payment_requests p join public.orders o on o.id=p.order_id where p.order_id=requested_order_id and o.tracking_token=requested_tracking_token for update of p;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if result.method<>'PIX' or result.status not in('REQUESTED','CUSTOMER_REPORTED') then raise exception 'PAYMENT_REPORT_NOT_ALLOWED'; end if;
 if result.status='REQUESTED' then update public.payment_requests set status='CUSTOMER_REPORTED',customer_reported_at=now() where id=result.id returning * into result; end if;
 return result;
end $$;

create or replace function public.confirm_order_payment(requested_order_id bigint,requested_confirmed_by uuid)
returns public.orders language plpgsql security definer set search_path='' as $$
declare payment public.payment_requests%rowtype; result public.orders%rowtype;
begin
 if not exists(select 1 from public.staff_profiles where user_id=requested_confirmed_by and active and role='ADMIN') then raise exception 'ADMIN_REQUIRED'; end if;
 select * into payment from public.payment_requests where order_id=requested_order_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if payment.status='CONFIRMED' then select * into result from public.orders where id=requested_order_id; return result; end if;
 if payment.status not in('REQUESTED','CUSTOMER_REPORTED') then raise exception 'PAYMENT_CONFIRM_NOT_ALLOWED'; end if;
 update public.payment_requests set status='CONFIRMED',confirmed_at=now(),confirmed_by=requested_confirmed_by where id=payment.id;
 select * into result from public.transition_order_status(requested_order_id,'PAGO');
 return result;
end $$;

create or replace function public.create_order_review(requested_order_id bigint,requested_tracking_token uuid,requested_rating integer,requested_comment text)
returns public.order_reviews language plpgsql security definer set search_path='' as $$
declare target_order public.orders%rowtype; visit uuid; result public.order_reviews%rowtype;
begin
 if requested_rating not between 1 and 5 or requested_comment is null or char_length(requested_comment)>1000 then raise exception 'INVALID_REVIEW'; end if;
 select * into target_order from public.orders where id=requested_order_id and tracking_token=requested_tracking_token for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if target_order.status<>'PAGO' then raise exception 'REVIEW_NOT_ALLOWED'; end if;
 select customer_visit_id into visit from public.table_sessions where id=target_order.session_id;
 insert into public.order_reviews(order_id,customer_visit_id,rating,comment) values(target_order.id,visit,requested_rating,nullif(trim(requested_comment),'')) returning * into result;
 return result;
exception when unique_violation then raise exception 'REVIEW_ALREADY_EXISTS';
end $$;

create or replace function public.broadcast_payment_change() returns trigger language plpgsql security definer set search_path='' as $$
declare token uuid;
begin select tracking_token into token from public.orders where id=new.order_id;
 perform realtime.send(jsonb_build_object('order_id',new.order_id,'payment_status',new.status,'payment_method',new.method),tg_op,'order:'||token::text,false); return new; end $$;
create trigger payment_requests_broadcast after insert or update on public.payment_requests for each row execute function public.broadcast_payment_change();

create or replace function public.product_sales_report(date_from timestamptz,date_to timestamptz)
returns table(product_id uuid,product_name text,quantity bigint,revenue numeric)
language sql stable security definer set search_path='' as $$
 select i.product_id,max(i.product_name),sum(i.quantity),sum(i.subtotal) from public.order_items i join public.orders o on o.id=i.order_id
 where o.status='PAGO' and o.paid_at>=date_from and o.paid_at<date_to group by i.product_id order by sum(i.quantity) desc,max(i.product_name)
$$;

revoke all on function public.start_table_visit(smallint,uuid,text,uuid),public.revise_received_order(bigint,jsonb,text),public.request_order_payment(bigint,uuid,public.payment_method),public.report_pix_payment(bigint,uuid),public.confirm_order_payment(bigint,uuid),public.create_order_review(bigint,uuid,integer,text),public.broadcast_payment_change(),public.product_sales_report(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.start_table_visit(smallint,uuid,text,uuid),public.revise_received_order(bigint,jsonb,text),public.request_order_payment(bigint,uuid,public.payment_method),public.report_pix_payment(bigint,uuid),public.confirm_order_payment(bigint,uuid),public.create_order_review(bigint,uuid,integer,text),public.product_sales_report(timestamptz,timestamptz) to service_role;
do $$ begin alter publication supabase_realtime add table public.payment_requests; exception when duplicate_object then null; end $$;
-- A service key bypasses RLS but PostgreSQL still requires explicit table privileges on a fresh local project.
grant all on table public.categories,public.products,public.restaurant_tables,public.table_sessions,public.customer_visits,public.orders,public.order_items,public.staff_profiles,public.payment_requests,public.order_reviews to service_role;
grant usage,select on all sequences in schema public to service_role;
notify pgrst,'reload schema';
