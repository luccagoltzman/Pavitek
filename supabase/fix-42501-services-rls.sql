-- Correcção: erro 42501 em public.services (RLS no insert/update/delete)
--
-- O insert só é permitido se:
--   1) Estiver autenticado no painel (JWT com role authenticated), e
--   2) Existir uma linha em public.admin_roles com user_id = auth.uid().
--
-- Rode A) e B) sempre. Em C) substitua o e-mail (obrigatório na primeira vez).

-- ---------------------------------------------------------------------------
-- A) Ver quem existe em Auth (confirme o e-mail do painel)
-- ---------------------------------------------------------------------------
-- select id, email, email_confirmed_at from auth.users;

-- ---------------------------------------------------------------------------
-- B) Políticas sem depender de public.is_admin() — usam EXISTS + auth.uid()
--    (funciona com a política admin_roles_select_self na mesma tabela)
-- ---------------------------------------------------------------------------

drop policy if exists "services_insert_admin" on public.services;
create policy "services_insert_admin"
on public.services
for insert
to authenticated
with check (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "services_update_admin" on public.services;
create policy "services_update_admin"
on public.services
for update
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
)
with check (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "services_delete_admin" on public.services;
create policy "services_delete_admin"
on public.services
for delete
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "service_images_insert_admin" on public.service_images;
create policy "service_images_insert_admin"
on public.service_images
for insert
to authenticated
with check (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "service_images_update_admin" on public.service_images;
create policy "service_images_update_admin"
on public.service_images
for update
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
)
with check (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "service_images_delete_admin" on public.service_images;
create policy "service_images_delete_admin"
on public.service_images
for delete
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "admin_roles_select_self" on public.admin_roles;
create policy "admin_roles_select_self"
on public.admin_roles
for select
to authenticated
using (user_id = auth.uid());

grant select on public.admin_roles to authenticated;

drop policy if exists "service_images_admin_insert" on storage.objects;
create policy "service_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-images'
  and auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "service_images_admin_update" on storage.objects;
create policy "service_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'service-images'
  and auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'service-images'
  and auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

drop policy if exists "service_images_admin_delete" on storage.objects;
create policy "service_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'service-images'
  and auth.uid() is not null
  and exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- C) Tornar o utilizador do painel administrador (substitua o e-mail)
-- ---------------------------------------------------------------------------
insert into public.admin_roles (user_id)
select id from auth.users where email = 'COLOQUE_O_EMAIL_DO_LOGIN_AQUI'
on conflict (user_id) do nothing;

-- Confirme: deve aparecer uma linha por admin.
-- select * from public.admin_roles;
