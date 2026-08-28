insert into public.restaurant_tables(number)
select number from generate_series(1, 45) as number
on conflict (number) do nothing;

insert into public.categories(id, slug, name_translations) values
  ('10000000-0000-4000-8000-000000000001', 'pizza', '{"pt":"Pizza","en":"Pizza","es":"Pizza"}'),
  ('10000000-0000-4000-8000-000000000002', 'porcoes', '{"pt":"Porções","en":"Sides","es":"Porciones"}'),
  ('10000000-0000-4000-8000-000000000003', 'hamburgueres', '{"pt":"Hambúrgueres","en":"Burgers","es":"Hamburguesas"}'),
  ('10000000-0000-4000-8000-000000000004', 'bebidas', '{"pt":"Bebidas","en":"Drinks","es":"Bebidas"}'),
  ('10000000-0000-4000-8000-000000000005', 'sobremesas', '{"pt":"Sobremesas","en":"Desserts","es":"Postres"}')
on conflict (id) do update set name_translations = excluded.name_translations;

insert into public.products(id, category_id, slug, name_translations, description_translations, price, emoji) values
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','pizza-margherita','{"pt":"Pizza Margherita","en":"Margherita Pizza","es":"Pizza Margarita"}','{"pt":"Molho de tomate, muçarela, tomate fresco e manjericão.","en":"Tomato sauce, mozzarella, fresh tomato and basil.","es":"Salsa de tomate, mozzarella, tomate fresco y albahaca."}',42.00,'🍕'),
  ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','pizza-pepperoni','{"pt":"Pizza Pepperoni","en":"Pepperoni Pizza","es":"Pizza Pepperoni"}','{"pt":"Molho de tomate, muçarela e pepperoni fatiado."}',48.00,'🍕'),
  ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','fries','{"pt":"Batata frita","en":"French fries","es":"Papas fritas"}','{"pt":"Porção crocante com molho da casa."}',18.90,'🍟'),
  ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','onion-rings','{"pt":"Anéis de cebola","en":"Onion rings","es":"Aros de cebolla"}','{"pt":"Porção empanada, sequinha e crocante."}',21.90,'🧅'),
  ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000003','burger','{"pt":"Hambúrguer Clássico","en":"Classic Burger","es":"Hamburguesa Clásica"}','{"pt":"Pão brioche, hambúrguer, queijo e molho especial."}',32.90,'🍔'),
  ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000004','soda','{"pt":"Refrigerante lata","en":"Canned soda","es":"Refresco en lata"}','{"pt":"Coca-Cola, Guaraná ou Coca-Cola Zero."}',8.00,'🥤'),
  ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000005','brownie','{"pt":"Brownie com sorvete","en":"Brownie with ice cream","es":"Brownie con helado"}','{"pt":"Brownie de chocolate servido com sorvete de baunilha."}',19.90,'🍨')
on conflict (id) do update set price = excluded.price, active = true;
