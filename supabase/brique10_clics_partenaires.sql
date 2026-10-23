-- ============================================================================
-- Brique 10 — Mesure des visites envoyées aux partenaires (ASC, Ircem, SPSTN)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, AVANT de publier la version
-- du site qui l'utilise. Peut être relancé sans danger.
--
-- Demande de Frédéric (23/10/2026) : savoir combien de personnes Aide & Garde
-- oriente vers chaque partenaire, pour le leur montrer. Chaque clic sur un
-- lien partenaire passe par /avantages/<partenaire> qui l'enregistre puis
-- redirige. On garde : le partenaire, l'endroit du site d'où vient le clic,
-- la date, et le compte de l'abonné s'il est connecté (pour compter des
-- personnes distinctes). Aucune adresse IP, aucun cookie.
-- Après 13 mois, le lien avec le compte est effacé : seuls les totaux restent.
-- ============================================================================

create table if not exists public.clics_partenaires (
  id            bigint generated always as identity primary key,
  partenaire    text not null check (partenaire in ('asc', 'ircem', 'spstn', 'spstn_salarie', 'fiche')),
  depuis        text not null default 'autre' check (char_length(depuis) between 1 and 40),
  employeur_id  uuid references public.profiles(id) on delete set null,
  clique_le     timestamptz not null default now()
);

create index if not exists clics_partenaires_date_idx on public.clics_partenaires (clique_le desc);

alter table public.clics_partenaires enable row level security;
revoke all on public.clics_partenaires from anon, authenticated;
grant select on public.clics_partenaires to authenticated;
grant all on public.clics_partenaires to service_role;

drop policy if exists clics_partenaires_admin on public.clics_partenaires;
create policy clics_partenaires_admin on public.clics_partenaires
  for select to authenticated
  using (public.is_admin());

-- Totaux par partenaire, mois et provenance (onglet Partenaires de l'admin).
drop view if exists public.admin_clics_partenaires;
create view public.admin_clics_partenaires
with (security_invoker = true) as
select
  partenaire,
  date_trunc('month', clique_le at time zone 'Europe/Paris')::date as mois,
  depuis,
  count(*)::int                         as clics,
  count(distinct employeur_id)::int     as abonnes,
  count(*) filter (where employeur_id is null)::int as visiteurs_non_connectes
from public.clics_partenaires
group by 1, 2, 3;

-- Totaux par partenaire et par mois, toutes provenances (abonnés distincts
-- exacts sur le mois, pour le pourcentage d'abonnés).
drop view if exists public.admin_clics_partenaires_mois;
create view public.admin_clics_partenaires_mois
with (security_invoker = true) as
select
  partenaire,
  date_trunc('month', clique_le at time zone 'Europe/Paris')::date as mois,
  count(*)::int                     as clics,
  count(distinct employeur_id)::int as abonnes
from public.clics_partenaires
group by 1, 2;

-- Totaux sur 12 mois glissants, abonnés distincts compris.
drop view if exists public.admin_clics_partenaires_12mois;
create view public.admin_clics_partenaires_12mois
with (security_invoker = true) as
select
  partenaire,
  count(*)::int                     as clics,
  count(distinct employeur_id)::int as abonnes,
  count(*) filter (where employeur_id is null)::int as visiteurs_non_connectes
from public.clics_partenaires
where clique_le >= now() - interval '12 months'
group by 1;

grant select on public.admin_clics_partenaires, public.admin_clics_partenaires_mois, public.admin_clics_partenaires_12mois to authenticated;

-- Effacement du lien avec le compte après 13 mois (tâche quotidienne).
create or replace function public.anonymiser_clics_partenaires()
returns integer
language sql
security definer
set search_path = ''
as $$
  with m as (
    update public.clics_partenaires set employeur_id = null
     where employeur_id is not null and clique_le < now() - interval '13 months'
    returning 1
  )
  select count(*)::int from m;
$$;

revoke all on function public.anonymiser_clics_partenaires() from public, anon, authenticated;
grant execute on function public.anonymiser_clics_partenaires() to service_role;
