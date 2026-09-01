-- Cliente identifica a mesa por token opaco no link/QR. table_sessions permanece intacta.
alter table public.restaurant_tables add column access_token uuid not null default gen_random_uuid() unique;
alter table public.table_sessions add column customer_name text;
alter table public.table_sessions add column customer_token uuid unique;

create or replace function public.create_customer_order(
  requested_customer_name text, requested_customer_token uuid, requested_items jsonb,
  requested_notes text, requested_idempotency_key uuid
)
returns table(order_id bigint, session_id uuid, order_total numeric, tracking_token uuid, table_number smallint)
language plpgsql security definer set search_path='' as $$
declare target_table public.restaurant_tables%rowtype; target_session public.table_sessions%rowtype;
 created_order_id bigint; calculated_total numeric(12,2);
begin
 if requested_customer_name is null or char_length(trim(requested_customer_name)) < 2 or char_length(trim(requested_customer_name)) > 80 then raise exception 'INVALID_CUSTOMER_NAME'; end if;
 if requested_customer_token is null then raise exception 'CUSTOMER_TOKEN_REQUIRED'; end if;
 if requested_idempotency_key is null then raise exception 'IDEMPOTENCY_KEY_REQUIRED'; end if;
 if requested_notes is null or char_length(requested_notes)>1000 then raise exception 'INVALID_NOTES'; end if;
 if jsonb_typeof(requested_items)<>'array' or jsonb_array_length(requested_items)=0 then raise exception 'EMPTY_ORDER'; end if;
 select * into target_session from public.table_sessions where customer_token=requested_customer_token and status='ABERTA' for update;
 if found then select * into target_table from public.restaurant_tables where id=target_session.table_id for update;
 else
   select * into target_table from public.restaurant_tables where status='LIVRE' order by number for update skip locked limit 1;
   if not found then raise exception 'NO_TABLE_AVAILABLE'; end if;
   insert into public.table_sessions(table_id,customer_name,customer_token) values(target_table.id,trim(requested_customer_name),requested_customer_token) returning * into target_session;
 end if;
 if exists(select 1 from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer) where i.product_id is null or i.quantity is null or i.quantity<=0 or i.quantity>99) then raise exception 'INVALID_ITEM'; end if;
 if (select count(*) from (select distinct i.product_id from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer)) x) <>
    (select count(*) from public.products p where p.id in(select distinct i.product_id from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer)) and p.active) then raise exception 'PRODUCT_NOT_FOUND_OR_INACTIVE'; end if;
 select coalesce(sum(p.price*r.quantity),0) into calculated_total from (select i.product_id,sum(i.quantity)::integer quantity from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer) group by i.product_id) r join public.products p on p.id=r.product_id and p.active;
 insert into public.orders(session_id,notes,total,idempotency_key) values(target_session.id,requested_notes,calculated_total,requested_idempotency_key) on conflict(idempotency_key) do nothing returning id into created_order_id;
 if created_order_id is null then select id,total into created_order_id,calculated_total from public.orders where idempotency_key=requested_idempotency_key;
 else insert into public.order_items(order_id,product_id,product_name,unit_price,quantity) select created_order_id,p.id,p.name_translations->>'pt',p.price,r.quantity from (select i.product_id,sum(i.quantity)::integer quantity from jsonb_to_recordset(requested_items) i(product_id uuid,quantity integer) group by i.product_id) r join public.products p on p.id=r.product_id; end if;
 update public.restaurant_tables set status='OCUPADA' where id=target_table.id;
 return query select created_order_id,target_session.id,calculated_total,(select o.tracking_token from public.orders o where o.id=created_order_id),target_table.number;
end $$;
revoke all on function public.create_customer_order(text,uuid,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.create_customer_order(text,uuid,jsonb,text,uuid) to service_role;

create or replace function public.validate_table_access(requested_table_number smallint, requested_access_token uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.restaurant_tables where number=requested_table_number and access_token=requested_access_token)
$$;
revoke all on function public.validate_table_access(smallint, uuid) from public, anon, authenticated;
grant execute on function public.validate_table_access(smallint, uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_profiles where user_id=(select auth.uid()) and active=true and role='ADMIN')
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated,service_role;
create policy product_images_public_read on storage.objects for select to public using (bucket_id='product-images');
create policy product_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id='product-images' and (select public.is_admin()));
create policy product_images_admin_update on storage.objects for update to authenticated using (bucket_id='product-images' and (select public.is_admin())) with check (bucket_id='product-images' and (select public.is_admin()));
create policy product_images_admin_delete on storage.objects for delete to authenticated using (bucket_id='product-images' and (select public.is_admin()));

create or replace function public.paid_sales_report(date_from timestamptz,date_to timestamptz,table_number smallint default null)
returns table(order_id bigint,paid_at timestamptz,table_no smallint,amount numeric)
language sql stable security definer set search_path = '' as $$
 select o.id,o.paid_at,t.number,o.total from public.orders o
 join public.table_sessions s on s.id=o.session_id join public.restaurant_tables t on t.id=s.table_id
 where o.status='PAGO' and o.paid_at>=date_from and o.paid_at<date_to and (table_number is null or t.number=table_number)
 order by o.paid_at desc
$$;
revoke all on function public.paid_sales_report(timestamptz,timestamptz,smallint) from public,anon,authenticated;
grant execute on function public.paid_sales_report(timestamptz,timestamptz,smallint) to service_role;
notify pgrst, 'reload schema';
