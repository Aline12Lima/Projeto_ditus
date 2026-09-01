begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('60000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','payments-admin@ditus.test','',now(),'{}','{}',now(),now()) on conflict(id) do nothing;
insert into public.staff_profiles(user_id,role,active) values('60000000-0000-4000-8000-000000000001','ADMIN',true) on conflict(user_id) do update set role='ADMIN',active=true;

select ok(public.validate_table_access(1::smallint,'40000000-0000-4000-8000-000000000001'),'validates the existing QR after hash backfill');
select throws_ok($$select * from public.start_table_visit(1::smallint,'40000000-0000-4000-8000-000000000099','Cliente QR','60000000-0000-4000-8000-000000000002')$$,'INVALID_TABLE_ACCESS','rejects invalid table QR');
select lives_ok($$select * from public.start_table_visit(1::smallint,'40000000-0000-4000-8000-000000000001','Cliente QR','60000000-0000-4000-8000-000000000002')$$,'starts a visit directly from QR');
select is((select status::text from public.customer_visits where customer_name='Cliente QR'),'MESA_ASSOCIADA','QR visit is immediately assigned');
select is((select status::text from public.restaurant_tables where number=1),'OCUPADA','QR visit occupies its physical table');
select is((select count(*)::integer from public.table_sessions where table_id=(select id from public.restaurant_tables where number=1) and status='ABERTA'),1,'has one open session');
select lives_ok($$select * from public.start_table_visit(1::smallint,'40000000-0000-4000-8000-000000000001','Cliente QR','60000000-0000-4000-8000-000000000002')$$,'same customer recovers QR visit idempotently');
select is((select count(*)::integer from public.table_sessions where table_id=(select id from public.restaurant_tables where number=1) and status='ABERTA'),1,'recovery does not duplicate session');
select throws_ok($$select * from public.start_table_visit(1::smallint,'40000000-0000-4000-8000-000000000001','Outro Cliente','60000000-0000-4000-8000-000000000003')$$,'TABLE_OCCUPIED','another customer cannot create a concurrent session');

select lives_ok($$select * from public.create_customer_order('Cliente QR','60000000-0000-4000-8000-000000000002','[{"product_id":"20000000-0000-4000-8000-000000000003","quantity":1}]','','60000000-0000-4000-8000-000000000010')$$,'creates received order for QR visit');
select lives_ok($$select public.revise_received_order((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),'[{"product_id":"20000000-0000-4000-8000-000000000003","quantity":2}]','Sem sal')$$,'revises received order');
select is((select total from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),37.80::numeric,'revision recalculates catalog price');
select lives_ok($$select public.transition_order_status((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),'EM_PREPARO');select public.transition_order_status((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),'PRONTO');select public.transition_order_status((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),'ENTREGUE')$$,'moves order through kitchen and delivery');
select throws_ok($$select public.create_order_review((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),(select tracking_token from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),5,'cedo')$$,'REVIEW_NOT_ALLOWED','rejects review before payment');
select lives_ok($$select public.request_order_payment((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),(select tracking_token from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),'PIX')$$,'customer requests Pix');
select lives_ok($$select public.report_pix_payment((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),(select tracking_token from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'))$$,'customer reports Pix without marking paid');
select is((select status::text from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),'AGUARDANDO_PAGAMENTO','reported Pix remains awaiting payment');
select lives_ok($$select public.confirm_order_payment((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),'60000000-0000-4000-8000-000000000001')$$,'admin confirms payment');
select lives_ok($$select public.create_order_review((select id from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),(select tracking_token from public.orders where idempotency_key='60000000-0000-4000-8000-000000000010'),5,'Muito bom')$$,'paid customer submits review');

select * from finish();
rollback;
