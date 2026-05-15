-- Pavitek — schema para serviços dinâmicos + painel admin (Supabase)
-- Projeto: https://cmlsxzvmtugynedcyptq.supabase.co
--
-- ORDEM SUGERIDA:
-- 1) Rode este script no SQL Editor do Supabase.
-- 2) Storage → crie o bucket "service-images" como PÚBLICO (ou use o bloco abaixo se vazio).
-- 3) Authentication → crie um utilizador (e-mail/password) para o cliente.
-- 4) Copie o UUID do utilizador (Authentication → Users) e execute o INSERT em admin_roles no fim.
-- 5) Copie a chave "anon" para config/supabase.public.js no site e no admin.

-- Extensão para gen_random_uuid (normalmente já activa no Supabase)
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_images (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists service_images_service_id_idx on public.service_images (service_id);
create index if not exists service_images_service_sort_idx on public.service_images (service_id, sort_order);
create index if not exists services_sort_idx on public.services (sort_order);

-- Quem pode usar o painel (inserir manualmente o user_id após criar o utilizador)
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.pavitek_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_services_updated_at on public.services;
create trigger tr_services_updated_at
before update on public.services
for each row
execute function public.pavitek_set_updated_at();

-- ---------------------------------------------------------------------------
-- is_admin() — não usar user_metadata; só tabela admin_roles
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles r
    where r.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.services enable row level security;
alter table public.service_images enable row level security;
alter table public.admin_roles enable row level security;

-- Leitura pública (site institucional)
drop policy if exists "services_select_public" on public.services;
create policy "services_select_public"
on public.services
for select
to anon, authenticated
using (true);

drop policy if exists "service_images_select_public" on public.service_images;
create policy "service_images_select_public"
on public.service_images
for select
to anon, authenticated
using (true);

-- Escrita apenas admin (autenticado + linha em admin_roles)
drop policy if exists "services_insert_admin" on public.services;
create policy "services_insert_admin"
on public.services
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "services_update_admin" on public.services;
create policy "services_update_admin"
on public.services
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "services_delete_admin" on public.services;
create policy "services_delete_admin"
on public.services
for delete
to authenticated
using (public.is_admin());

drop policy if exists "service_images_insert_admin" on public.service_images;
create policy "service_images_insert_admin"
on public.service_images
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "service_images_update_admin" on public.service_images;
create policy "service_images_update_admin"
on public.service_images
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "service_images_delete_admin" on public.service_images;
create policy "service_images_delete_admin"
on public.service_images
for delete
to authenticated
using (public.is_admin());

-- admin_roles: sem políticas → inacessível pela API (só SQL no dashboard)

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.services to anon, authenticated;
grant select on public.service_images to anon, authenticated;

grant insert, update, delete on public.services to authenticated;
grant insert, update, delete on public.service_images to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket público para URLs directas no site
-- (Se o bucket já existir, pode ignorar o erro ou comentar esta parte.)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do update set public = excluded.public;

-- Políticas storage.objects
drop policy if exists "service_images_public_read" on storage.objects;
create policy "service_images_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'service-images');

drop policy if exists "service_images_admin_insert" on storage.objects;
create policy "service_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'service-images' and public.is_admin());

drop policy if exists "service_images_admin_update" on storage.objects;
create policy "service_images_admin_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'service-images' and public.is_admin())
with check (bucket_id = 'service-images' and public.is_admin());

drop policy if exists "service_images_admin_delete" on storage.objects;
create policy "service_images_admin_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'service-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- APÓS CRIAR O UTILIZADOR NO AUTH, descomente e substitua o UUID:
-- insert into public.admin_roles (user_id) values ('00000000-0000-0000-0000-000000000000');
-- ---------------------------------------------------------------------------
