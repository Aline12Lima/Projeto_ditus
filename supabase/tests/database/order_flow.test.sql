begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is((select count(*)::integer from public.restaurant_tables), 45, 'seed creates 45 tables');

select lives_ok($$
  select * from public.create_order(1::smallint, '[{"product_id":"20000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb, ''::text, '30000000-0000-4000-8000-000000000001'::uuid)
$$, 'creates a valid order');
select is((select total from public.orders where idempotency_key = '30000000-0000-4000-8000-000000000001'), 84.00::numeric, 'server calculates total from database price');
select is((select count(*)::integer from public.table_sessions where table_id = 1 and status = 'ABERTA'), 1, 'opens one table session');

select lives_ok($$
  select * from public.create_order(1::smallint, '[{"product_id":"20000000-0000-4000-8000-000000000006","quantity":1}]'::jsonb, ''::text, '30000000-0000-4000-8000-000000000002'::uuid)
$$, 'creates a second order for the same table');
select is((select count(*)::integer from public.table_sessions where table_id = 1 and status = 'ABERTA'), 1, 'reuses the open session');

update public.products set active = false where id = '20000000-0000-4000-8000-000000000007';
select throws_ok($$
  select * from public.create_order(2::smallint, '[{"product_id":"20000000-0000-4000-8000-000000000007","quantity":1}]'::jsonb, ''::text, '30000000-0000-4000-8000-000000000003'::uuid)
$$, 'PRODUCT_NOT_FOUND_OR_INACTIVE', 'rejects inactive product');

select throws_ok($$ select public.transition_order_status(1::bigint, 'PAGO'::public.order_status) $$, 'INVALID_STATUS_TRANSITION', 'rejects invalid transition');
select lives_ok($$ select public.transition_order_status(1::bigint, 'EM_PREPARO'::public.order_status); select public.transition_order_status(1::bigint, 'PRONTO'::public.order_status); select public.transition_order_status(1::bigint, 'ENTREGUE'::public.order_status); select public.transition_order_status(1::bigint, 'AGUARDANDO_PAGAMENTO'::public.order_status); select public.transition_order_status(1::bigint, 'PAGO'::public.order_status) $$, 'accepts valid status flow');
select is((select status::text from public.restaurant_tables where number = 1), 'AGUARDANDO_PAGAMENTO', 'keeps table open while another order is unpaid');

select * from finish();
rollback;
