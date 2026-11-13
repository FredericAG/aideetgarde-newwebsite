-- Imitation minimale de Supabase pour les tests (rôles, schémas auth et
-- storage, auth.uid()). Jamais exécuté dans Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end;
$$;

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;

-- Session simulée : select set_config('request.jwt.claim.sub', '<uuid>', true);
create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  encrypted_password text,
  created_at timestamptz default now(),
  instance_id uuid,
  aud text,
  role text,
  email_confirmed_at timestamptz,
  updated_at timestamptz,
  raw_app_meta_data jsonb,
  confirmation_token text,
  recovery_token text,
  email_change text,
  email_change_token_new text
);
create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, provider_id text, identity_data jsonb, provider text,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
);

create or replace function storage.foldername(name text) returns text[]
language sql as $$ select string_to_array(name, '/') $$;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
