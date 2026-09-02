begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','61000000-0000-4000-8000-000000000001','authenticated','authenticated','force-close-admin@ditus.test','',now(),now(),now())
on conflict(id) do nothing;
insert into public.staff_profiles(user_id,role,active)
values('61000000-0000-4000-8000-000000000001','ADMIN',true)
on conflict(user_id) do update set role='ADMIN',active=true;

select lives_ok($$
  select * from public.start_table_visit(1::smallint,'40000000-0000-4000-8000-000000000001'::uuid,'Force Close','62000000-0000-4000-8000-000000000001'::uuid)
$$, 'opens a QR table visit');
select lives_ok($$
  select * from public.create_customer_order('Force Close','62000000-0000-4000-8000-000000000001'::uuid,'[{"product_id":"20000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,'','63000000-0000-4000-8000-000000000001'::uuid)
$$, 'creates an active order');
select lives_ok($$select * from public.transition_order_status((select id from public.orders where idempotency_key='63000000-0000-4000-8000-000000000001'),'EM_PREPARO')$$, 'moves the order beyond received');
select throws_ok($$select * from public.force_close_table_session(1::smallint,'00000000-0000-0000-0000-000000000099'::uuid)$$, 'ADMIN_REQUIRED', 'rejects a non-admin');
select lives_ok($$select * from public.force_close_table_session(1::smallint,'61000000-0000-4000-8000-000000000001'::uuid)$$, 'admin force closes the session');
select is((select status::text from public.orders where idempotency_key='63000000-0000-4000-8000-000000000001'),'CANCELADO','cancels an active order');
select ok((select cancelled_at is not null from public.orders where idempotency_key='63000000-0000-4000-8000-000000000001'),'sets cancellation timestamp');
select is((select status::text from public.table_sessions where customer_name='Force Close'),'ENCERRADA','closes the session');
select ok((select closed_at is not null from public.table_sessions where customer_name='Force Close'),'sets session close timestamp');
select is((select status::text from public.customer_visits where customer_name='Force Close'),'ENCERRADA','closes the visit');
select is((select status::text from public.restaurant_tables where number=1),'LIVRE','releases the table');
select lives_ok($$select * from public.force_close_table_session(1::smallint,'61000000-0000-4000-8000-000000000001'::uuid)$$, 'repeating on a free table is idempotent');

select * from finish();
rollback;
