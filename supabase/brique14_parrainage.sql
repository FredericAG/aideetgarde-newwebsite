-- ============================================================================
-- Brique 14 — Parrainage (13/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique13. Peut être
-- relancé sans danger.
--
-- Règle décidée le 13/11 : un mois offert au filleul et un au parrain, une
-- fois le premier mois du filleul payé ET son délai de rétractation de
-- 14 jours écoulé sans rétractation. Le mois offert s'applique à la
-- prochaine échéance de chacun (pas de prélèvement ce mois-là).
-- - Chaque compte a un code personnel (8 caractères), partagé par l'abonné
--   lui-même (lien /inscription?parrain=CODE) : le site n'envoie rien.
-- - Parrain crédité seulement s'il a un abonnement actif ; 12 mois offerts
--   au plus par parrain et par année civile.
-- - Un abonnement saisi à la main (ancien site) garde ses mois offerts :
--   l'administration les applique elle-même.
-- ============================================================================

-- 1. Code personnel et parrain ------------------------------------------------
alter table public.profiles
  add column if not exists code_parrainage text,
  add column if not exists parrain_id uuid references public.profiles(id) on delete set null;

create unique index if not exists profiles_code_parrainage_idx on public.profiles (code_parrainage);

create or replace function public.nouveau_code_parrainage()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v text;
begin
  loop
    -- 8 caractères sans 0/O ni 1/I, pour être dictés sans erreur.
    v := translate(upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), '01', 'XY');
    exit when not exists (select 1 from public.profiles where code_parrainage = v);
  end loop;
  return v;
end;
$$;

do $$
declare
  r record;
begin
  for r in select id from public.profiles where code_parrainage is null loop
    update public.profiles set code_parrainage = public.nouveau_code_parrainage() where id = r.id;
  end loop;
end;
$$;

create or replace function public.profils_code_parrainage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code_parrainage is null then
    new.code_parrainage := public.nouveau_code_parrainage();
  end if;
  return new;
end;
$$;

drop trigger if exists profils_code_parrainage on public.profiles;
create trigger profils_code_parrainage
  before insert on public.profiles
  for each row execute function public.profils_code_parrainage();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_decl text := new.raw_user_meta_data ->> 'origine';
  v_arr  text := new.raw_user_meta_data ->> 'arrivee';
  v_parrain uuid;
begin
  -- Code de parrainage saisi à l'inscription (brique 14).
  select id into v_parrain from public.profiles
   where code_parrainage = upper(trim(new.raw_user_meta_data ->> 'parrain'));
  if v_decl not in ('recherche', 'annonce', 'proche', 'partenaire', 'professionnel',
                    'reseaux', 'deja_client', 'autre') then
    v_decl := null;
  end if;
  if v_arr not in ('direct', 'moteur', 'annonce', 'reseaux', 'recommandation',
                   'partenaire', 'email', 'autre_site') then
    v_arr := null;
  end if;
  insert into public.profiles (id, email, prenom, nom, origine_declaree, origine_arrivee, parrain_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    coalesce(new.raw_user_meta_data ->> 'nom', ''),
    v_decl,
    v_arr,
    v_parrain
  );
  return new;
end;
$$;

-- 2. Mois offerts -------------------------------------------------------------
alter table public.abonnements
  add column if not exists mois_offerts smallint not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'abonnements_mois_offerts_check') then
    alter table public.abonnements add constraint abonnements_mois_offerts_check check (mois_offerts between 0 and 24);
  end if;
end;
$$;

-- Trace des mois non prélevés (abonné et administration).
create table if not exists public.mois_offerts_utilises (
  id             uuid primary key default gen_random_uuid(),
  abonnement_id  uuid not null references public.abonnements(id) on delete cascade,
  employeur_id   uuid not null references public.profiles(id) on delete cascade,
  date_echeance  date not null,
  created_at     timestamptz not null default now(),
  unique (abonnement_id, date_echeance)
);
alter table public.mois_offerts_utilises enable row level security;
revoke all on public.mois_offerts_utilises from anon, authenticated;
grant select on public.mois_offerts_utilises to authenticated;
grant all on public.mois_offerts_utilises to service_role;
drop policy if exists mois_offerts_utilises_lecture on public.mois_offerts_utilises;
create policy mois_offerts_utilises_lecture on public.mois_offerts_utilises
  for select to authenticated
  using (employeur_id = (select auth.uid()) or public.is_admin());

-- Échéances du jour : un mois offert remplace l'échéance du mois.
create or replace function public.systempay_echeances_a_traiter(p_limite integer default 500)
returns table (
  echeance_id   uuid,
  order_id      text,
  montant       numeric,
  token         text,
  employeur_id  uuid,
  email         text,
  reference     text,
  incertaine    boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
begin
  for a in
    select * from public.abonnements
     where statut = 'actif'
       and mode_paiement = 'systempay'
       and statut_paiement <> 'impaye'
       and prochaine_echeance <= current_date
     for update skip locked
  loop
    -- Rattrape aussi plusieurs mois si le traitement a été interrompu.
    -- Résiliation demandée (brique 5b) : seules les échéances qui tombent
    -- au plus tard le dernier jour de l'abonnement sont créées.
    while a.prochaine_echeance <= current_date
          and (a.fin_prevue is null or a.prochaine_echeance <= a.fin_prevue) loop
      -- Mois offert (parrainage, brique 14) : pas d'échéance ce mois-là.
      if coalesce(a.mois_offerts, 0) > 0 then
        insert into public.mois_offerts_utilises (abonnement_id, employeur_id, date_echeance)
        values (a.id, a.employeur_id, a.prochaine_echeance)
        on conflict (abonnement_id, date_echeance) do nothing;
        a.mois_offerts := a.mois_offerts - 1;
      else
        insert into public.echeances (abonnement_id, employeur_id, date_echeance, montant,
                                      prochaine_tentative, order_id)
        values (a.id, a.employeur_id, a.prochaine_echeance, a.tarif_mensuel, a.prochaine_echeance,
                'E' || to_char(a.prochaine_echeance, 'YYYYMMDD') || '-' || replace(a.id::text, '-', ''))
        on conflict (abonnement_id, date_echeance) do nothing;
      end if;
      a.prochaine_echeance := public.date_echeance_suivante(a.prochaine_echeance, a.jour_prelevement);
    end loop;
    update public.abonnements set prochaine_echeance = a.prochaine_echeance, mois_offerts = a.mois_offerts where id = a.id;
  end loop;

  return query
  with choisies as (
    select e.id, (e.en_cours_depuis is not null) as incertaine
      from public.echeances e
      join public.abonnements ab on ab.id = e.abonnement_id
     where e.statut = 'a_payer'
       and e.prochaine_tentative <= current_date
       and ab.statut = 'actif'            -- abonnement résilié : plus aucun débit
       and ab.mode_paiement = 'systempay'
       and ab.systempay_token is not null
       and (e.en_cours_depuis is null or e.en_cours_depuis < now() - interval '30 minutes')
     order by e.prochaine_tentative, e.date_echeance
     limit p_limite
     for update of e skip locked
  ), reservees as (
    update public.echeances e
       set en_cours_depuis = now()
      from choisies c
     where e.id = c.id
    returning e.id, e.order_id, e.montant, e.abonnement_id, e.employeur_id, c.incertaine
  )
  select r.id, r.order_id, r.montant, ab.systempay_token, r.employeur_id, p.email,
         coalesce(p.reference_client, r.employeur_id::text), r.incertaine
    from reservees r
    join public.abonnements ab on ab.id = r.abonnement_id
    join public.profiles p on p.id = r.employeur_id;
end;
$$;

-- 3. Parrainages accordés -----------------------------------------------------
create table if not exists public.parrainages (
  id               uuid primary key default gen_random_uuid(),
  parrain_id       uuid references public.profiles(id) on delete set null,
  filleul_id       uuid not null unique references public.profiles(id) on delete cascade,
  parrain_credite  boolean not null,
  accorde_le       timestamptz not null default now()
);
alter table public.parrainages enable row level security;
revoke all on public.parrainages from anon, authenticated;
grant select on public.parrainages to authenticated;
grant all on public.parrainages to service_role;
drop policy if exists parrainages_lecture on public.parrainages;
create policy parrainages_lecture on public.parrainages
  for select to authenticated
  using (parrain_id = (select auth.uid()) or filleul_id = (select auth.uid()) or public.is_admin());

-- Appelée chaque matin par le traitement quotidien (clé secrète).
create or replace function public.accorder_parrainages()
returns table (filleul_id uuid, parrain_id uuid, parrain_credite boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  f record;
  v_abo_parrain uuid;
  v_nb integer;
  v_ok boolean;
begin
  for f in
    select p.id as filleul, p.parrain_id as parrain, ab.id as abo
      from public.profiles p
      join public.abonnements ab on ab.employeur_id = p.id and ab.statut = 'actif'
     where p.parrain_id is not null
       and p.parrain_id <> p.id
       and ab.date_debut <= current_date - 14
       and not exists (select 1 from public.parrainages x where x.filleul_id = p.id)
       and exists (select 1 from public.commandes c
                    where c.employeur_id = p.id and c.type = 'souscription' and c.statut = 'payee')
       and not exists (select 1 from public.retractations r where r.employeur_id = p.id)
     for update of ab skip locked
  loop
    update public.abonnements set mois_offerts = mois_offerts + 1 where id = f.abo;

    select id into v_abo_parrain from public.abonnements
     where employeur_id = f.parrain and statut = 'actif';
    select count(*) into v_nb from public.parrainages x
     where x.parrain_id = f.parrain and x.parrain_credite
       and date_trunc('year', x.accorde_le) = date_trunc('year', now());
    v_ok := v_abo_parrain is not null and v_nb < 12;
    if v_ok then
      update public.abonnements set mois_offerts = mois_offerts + 1 where id = v_abo_parrain;
    end if;

    insert into public.parrainages (parrain_id, filleul_id, parrain_credite)
    values (f.parrain, f.filleul, v_ok);

    filleul_id := f.filleul;
    parrain_id := f.parrain;
    parrain_credite := v_ok;
    return next;
  end loop;
end;
$$;

revoke all on function public.accorder_parrainages() from public, anon, authenticated;
grant execute on function public.accorder_parrainages() to service_role;
revoke all on function public.nouveau_code_parrainage() from public, anon, authenticated;
grant execute on function public.systempay_echeances_a_traiter(integer) to service_role;

insert into public.scripts_sql (nom) values ('brique14_parrainage') on conflict (nom) do nothing;
