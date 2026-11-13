-- ============================================================================
-- Brique 12 — Mesure du tunnel d'acquisition (13/11/2026, audit T1)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique5g. Peut être
-- relancé sans danger.
--
-- Mesure d'audience « maison », SANS cookie ni identifiant (pas de bandeau) :
-- le site compte, par jour, les pages vues et l'origine des visites (moteur
-- de recherche, annonce, réseaux, recommandation…). Aucune adresse IP, aucun
-- navigateur, aucun lien avec un compte n'est enregistré : seulement des
-- totaux.
--
-- À l'inscription, l'origine déclarée (« Comment nous avez-vous connus ? »)
-- et celle de la page d'arrivée sont gardées dans le profil, pour suivre
-- comptes, abonnements et gestions par origine.
-- ============================================================================

-- 1. Totaux par jour, page et origine
create table if not exists public.visites_jour (
  jour    date    not null,
  page    text    not null,
  origine text    not null,
  nb      integer not null default 0,
  primary key (jour, page, origine)
);

alter table public.visites_jour enable row level security;
revoke all on public.visites_jour from anon, authenticated;
grant select on public.visites_jour to authenticated;
grant all on public.visites_jour to service_role;

drop policy if exists visites_jour_equipe on public.visites_jour;
create policy visites_jour_equipe on public.visites_jour
  for select to authenticated using (public.is_admin());

-- Appelée par le serveur du site (route /api/mesure, clé secrète).
create or replace function public.compter_visite(p_page text, p_origine text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_page is null or p_page !~ '^/[A-Za-z0-9/_.\[\]-]{0,120}$' then
    return;
  end if;
  if p_origine not in ('direct', 'interne', 'moteur', 'annonce', 'reseaux', 'recommandation',
                       'partenaire', 'email', 'autre_site') then
    return;
  end if;
  insert into public.visites_jour (jour, page, origine, nb)
  values ((now() at time zone 'Europe/Paris')::date, p_page, p_origine, 1)
  on conflict (jour, page, origine) do update set nb = public.visites_jour.nb + 1;
end;
$$;

revoke all on function public.compter_visite(text, text) from public, anon, authenticated;
grant execute on function public.compter_visite(text, text) to service_role;

-- 2. Origine des comptes
alter table public.profiles
  add column if not exists origine_declaree text,
  add column if not exists origine_arrivee  text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_origine_declaree_check') then
    alter table public.profiles add constraint profiles_origine_declaree_check
      check (origine_declaree in ('recherche', 'annonce', 'proche', 'partenaire', 'professionnel',
                                  'reseaux', 'deja_client', 'autre'));
  end if;
end;
$$;

-- Le profil est créé à l'inscription (schema.sql) : on y ajoute les deux
-- origines transmises par le formulaire, si elles sont valides.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_decl text := new.raw_user_meta_data ->> 'origine';
  v_arr  text := new.raw_user_meta_data ->> 'arrivee';
begin
  if v_decl not in ('recherche', 'annonce', 'proche', 'partenaire', 'professionnel',
                    'reseaux', 'deja_client', 'autre') then
    v_decl := null;
  end if;
  if v_arr not in ('direct', 'moteur', 'annonce', 'reseaux', 'recommandation',
                   'partenaire', 'email', 'autre_site') then
    v_arr := null;
  end if;
  insert into public.profiles (id, email, prenom, nom, origine_declaree, origine_arrivee)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    coalesce(new.raw_user_meta_data ->> 'nom', ''),
    v_decl,
    v_arr
  );
  return new;
end;
$$;

-- Registre des scripts (brique13) : ce script s'inscrit s'il est déjà en place.
do $$
begin
  if to_regclass('public.scripts_sql') is not null then
    insert into public.scripts_sql (nom) values ('brique12_mesure_tunnel') on conflict (nom) do nothing;
  end if;
end;
$$;
