-- ============================================================================
-- Brique 5e — Recommander Aide & Garde (bouche à oreille)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, AVANT de publier la version
-- du site qui l'utilise. Peut être relancé sans danger.
--
-- Chaque recommandation envoyée par un abonné est comptée, SANS l'adresse
-- ni le nom de la personne recommandée (CNIL : l'adresse ne sert qu'une
-- fois, pour l'envoi demandé). Sert à limiter les envois (10 par 24 h) et
-- à mesurer le bouche à oreille.
-- ============================================================================

create table if not exists public.recommandations (
  id            uuid primary key default gen_random_uuid(),
  employeur_id  uuid not null references public.profiles(id) on delete cascade,
  envoyee_le    timestamptz not null default now()
);

create index if not exists recommandations_employeur_idx on public.recommandations (employeur_id, envoyee_le desc);

alter table public.recommandations enable row level security;
revoke all on public.recommandations from anon, authenticated;
grant select, insert on public.recommandations to authenticated;
grant all on public.recommandations to service_role;

drop policy if exists recommandations_lecture on public.recommandations;
create policy recommandations_lecture on public.recommandations
  for select to authenticated
  using (employeur_id = (select auth.uid()) or public.is_admin());

drop policy if exists recommandations_ajout on public.recommandations;
create policy recommandations_ajout on public.recommandations
  for insert to authenticated
  with check (employeur_id = (select auth.uid()));
