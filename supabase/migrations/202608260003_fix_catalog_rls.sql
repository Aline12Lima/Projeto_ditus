drop policy if exists categories_public_read on public.categories;
drop policy if exists products_public_read on public.products;

create policy categories_anon_read
on public.categories for select to anon
using (active = true);

create policy categories_authenticated_read
on public.categories for select to authenticated
using (active = true or (select public.is_staff()));

create policy products_anon_read
on public.products for select to anon
using (active = true);

create policy products_authenticated_read
on public.products for select to authenticated
using (active = true or (select public.is_staff()));
