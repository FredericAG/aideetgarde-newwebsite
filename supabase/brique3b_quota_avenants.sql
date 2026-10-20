-- ============================================================================
-- Brique 3b — quota fiable + demandes d'avenant
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3
-- (peut être relancé sans danger).
--
-- 1. Correction du quota (recette 3.7) : le quota était compté par
--    abonnement. Or des gestions en cours peuvent rester rattachées à un
--    ANCIEN abonnement résilié (cas du compte de test : abonnement résilié
--    puis recréé le 15-16/10). Elles n'étaient donc pas comptées, et l'on
--    pouvait dépasser la limite. Désormais :
--    - le quota compte TOUTES les gestions envoyées ou en cours de
--      l'employeur, quel que soit leur abonnement d'origine ;
--    - il est comparé au quota de l'abonnement ACTIF ;
--    - il est vérifié à chaque entrée dans le quota, y compris à la
--      validation par l'administrateur (envoyée → en cours) ;
--    - on ne peut plus baisser un quota sous le nombre de places utilisées.
-- 2. Demandes d'avenant : sur une gestion en cours, l'abonné signale un
--    changement (garde partagée, organisation, adresse, taux horaire…) ;
--    l'administrateur la voit dans ses « actions à effectuer ».
-- ============================================================================

-- 1a. Quota par employeur -----------------------------------------------------
create or replace function public.check_gestion_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abo   public.abonnements%rowtype;
  v_actif public.abonnements%rowtype;
  v_count integer;
begin
  select * into v_abo from public.abonnements where id = new.abonnement_id;
  if not found then
    raise exception 'Abonnement introuvable.';
  end if;
  if v_abo.employeur_id <> new.employeur_id then
    raise exception 'La gestion doit appartenir au même employeur que son abonnement.';
  end if;

  -- Contrôle à chaque passage vers « envoyée » ou « en cours » (création,
  -- envoi, validation, réouverture).
  if new.statut in ('envoyee', 'en_cours')
     and (tg_op = 'INSERT' or old.statut is distinct from new.statut) then

    select * into v_actif from public.abonnements
     where employeur_id = new.employeur_id and statut = 'actif';
    if not found then
      raise exception 'Aucun abonnement actif : impossible d''ouvrir ou de valider une gestion.';
    end if;
    -- La gestion est rattachée à l'abonnement actif.
    new.abonnement_id := v_actif.id;

    select count(*) into v_count
      from public.gestions
     where employeur_id = new.employeur_id
       and statut in ('envoyee', 'en_cours')
       and id <> new.id
       -- Une gestion envoyée qu'on valide garde sa place : on ne la compte
       -- pas deux fois (elle est exclue par id ci-dessus).
       ;
    if v_count >= v_actif.quota_gestions then
      raise exception 'Quota atteint : % place(s) déjà utilisée(s) (gestions en cours ou à valider) pour un quota de %. Terminez une gestion ou augmentez le quota de l''abonnement.',
        v_count, v_actif.quota_gestions;
    end if;
  end if;
  return new;
end;
$$;

-- 1b. Rattacher à l'abonnement actif les gestions restées sur un ancien
--     abonnement (données de test).
update public.gestions g
   set abonnement_id = a.id
  from public.abonnements a
 where a.employeur_id = g.employeur_id
   and a.statut = 'actif'
   and g.statut in ('brouillon', 'envoyee', 'en_cours')
   and g.abonnement_id <> a.id;

-- 1c. Pas de quota inférieur aux places déjà utilisées.
create or replace function public.check_abonnement_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if new.statut = 'actif'
     and (tg_op = 'INSERT' or new.quota_gestions < old.quota_gestions or old.statut <> 'actif') then
    select count(*) into v_count from public.gestions
     where employeur_id = new.employeur_id and statut in ('envoyee', 'en_cours');
    if new.quota_gestions < v_count then
      raise exception 'Quota trop bas : ce compte utilise déjà % place(s) (gestions en cours ou à valider). Terminez des gestions avant de baisser le quota.',
        v_count;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists abonnements_check_quota on public.abonnements;
create trigger abonnements_check_quota
  before insert or update on public.abonnements
  for each row execute function public.check_abonnement_quota();

-- 2. Demandes d'avenant -------------------------------------------------------
create table if not exists public.demandes_avenant (
  id           uuid primary key default gen_random_uuid(),
  gestion_id   uuid not null references public.gestions(id) on delete cascade,
  employeur_id uuid not null references public.profiles(id) on delete cascade,
  objets       text[] not null default '{}',
  date_effet   date,
  description  text not null default '',
  statut       text not null default 'envoyee' check (statut in ('envoyee', 'traitee')),
  created_at   timestamptz not null default now(),
  traitee_le   timestamptz
);

create index if not exists demandes_avenant_gestion_idx on public.demandes_avenant (gestion_id);
create index if not exists demandes_avenant_a_traiter_idx
  on public.demandes_avenant (created_at) where statut = 'envoyee';

alter table public.demandes_avenant enable row level security;
revoke all on public.demandes_avenant from anon, authenticated;
grant select on public.demandes_avenant to authenticated;
grant insert, update, delete on public.demandes_avenant to authenticated;

drop policy if exists demandes_avenant_select_own on public.demandes_avenant;
create policy demandes_avenant_select_own on public.demandes_avenant
  for select to authenticated
  using (employeur_id = (select auth.uid()));

drop policy if exists demandes_avenant_admin_all on public.demandes_avenant;
create policy demandes_avenant_admin_all on public.demandes_avenant
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- L'abonné passe par cette fonction (aucun droit d'écriture directe).
create or replace function public.demander_avenant(
  p_gestion_id uuid,
  p_objets text[],
  p_date_effet date,
  p_description text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if not exists (
    select 1 from public.gestions
     where id = p_gestion_id and employeur_id = v_uid and statut = 'en_cours'
  ) then
    raise exception 'Un avenant ne peut être demandé que pour une de vos gestions en cours.';
  end if;
  if coalesce(array_length(p_objets, 1), 0) = 0 then
    raise exception 'Indiquez ce qui change (au moins un choix).';
  end if;
  if not (p_objets <@ array['garde_partagee', 'organisation', 'adresse', 'taux_horaire', 'duree_travail', 'autre']) then
    raise exception 'Type de changement inconnu.';
  end if;
  if length(coalesce(trim(p_description), '')) < 3 then
    raise exception 'Décrivez le changement en quelques mots.';
  end if;
  if exists (
    select 1 from public.demandes_avenant where gestion_id = p_gestion_id and statut = 'envoyee'
  ) then
    raise exception 'Une demande d''avenant est déjà en cours de traitement pour cette gestion.';
  end if;

  insert into public.demandes_avenant (gestion_id, employeur_id, objets, date_effet, description)
  values (p_gestion_id, v_uid, p_objets, p_date_effet, left(trim(p_description), 2000))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.demander_avenant(uuid, text[], date, text) from public, anon;
grant execute on function public.demander_avenant(uuid, text[], date, text) to authenticated;

-- Dépôt d'un avenant (document) → la demande en attente est traitée.
create or replace function public.marquer_avenant_traite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type_document = 'avenant' then
    update public.demandes_avenant
       set statut = 'traitee', traitee_le = now()
     where gestion_id = new.gestion_id and statut = 'envoyee';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_marquer_avenant on public.documents;
create trigger documents_marquer_avenant
  after insert on public.documents
  for each row execute function public.marquer_avenant_traite();
