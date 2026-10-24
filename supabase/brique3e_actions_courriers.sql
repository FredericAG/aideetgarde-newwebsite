-- ============================================================================
-- Brique 3e — Cadre « Actions » de la gestion : courriers préremplis, mois à
-- déclarer, événements signalés à Aide & Garde
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3d et
-- brique7d. Peut être relancé sans danger.
--
-- Demande de Frédéric (24/10/2026) :
--   1. Courriers préremplis (attestation d'emploi, lettres de fin de
--      contrat…) : il manquait la civilité de l'employeur, la civilité et
--      l'adresse du salarié. L'abonné les saisit une fois dans le petit
--      formulaire du courrier ; elles sont mémorisées ici.
--   2. « Déclarer le mois » propose tous les mois depuis le début du contrat
--      qui n'ont pas de bulletin en ligne. Pour un abonné repris en cours de
--      route (bulletins précédents faits par lui-même), l'administrateur fixe
--      le premier mois à déclarer (declarations_depuis).
--   3. Fin de contrat, accident du travail, arrêt maladie : l'abonné prévient
--      Aide & Garde en deux clics (table signalements) ; la demande apparaît
--      dans les actions à traiter de l'administration.
-- ============================================================================

-- 1. Coordonnées pour les courriers ------------------------------------------
alter table public.profiles add column if not exists civilite text not null default '';
alter table public.gestions add column if not exists civilite_salarie text not null default '';
alter table public.gestions add column if not exists adresse_salarie text not null default '';
alter table public.gestions add column if not exists code_postal_salarie text not null default '';
alter table public.gestions add column if not exists ville_salarie text not null default '';

alter table public.profiles drop constraint if exists profiles_civilite_check;
alter table public.profiles add constraint profiles_civilite_check
  check (civilite in ('', 'Madame', 'Monsieur'));
alter table public.gestions drop constraint if exists gestions_civilite_salarie_check;
alter table public.gestions add constraint gestions_civilite_salarie_check
  check (civilite_salarie in ('', 'Madame', 'Monsieur'));

-- L'abonné passe par cette fonction (aucun droit d'écriture directe sur une
-- gestion en cours). Les valeurs vides ne remplacent pas une valeur connue.
create or replace function public.memoriser_coordonnees_courrier(
  p_gestion_id uuid,
  p_civilite_employeur text,
  p_civilite_salarie text,
  p_adresse_salarie text,
  p_code_postal_salarie text,
  p_ville_salarie text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.gestions where id = p_gestion_id and employeur_id = v_uid
  ) then
    raise exception 'Gestion introuvable.';
  end if;
  if coalesce(p_civilite_employeur, '') not in ('', 'Madame', 'Monsieur')
     or coalesce(p_civilite_salarie, '') not in ('', 'Madame', 'Monsieur') then
    raise exception 'Civilité inconnue.';
  end if;

  if coalesce(p_civilite_employeur, '') <> '' then
    update public.profiles set civilite = p_civilite_employeur where id = v_uid;
  end if;

  update public.gestions
     set civilite_salarie = coalesce(nullif(p_civilite_salarie, ''), civilite_salarie),
         adresse_salarie = coalesce(nullif(left(trim(p_adresse_salarie), 200), ''), adresse_salarie),
         code_postal_salarie = coalesce(nullif(left(trim(p_code_postal_salarie), 10), ''), code_postal_salarie),
         ville_salarie = coalesce(nullif(left(trim(p_ville_salarie), 100), ''), ville_salarie)
   where id = p_gestion_id and employeur_id = v_uid;
end;
$$;

revoke all on function public.memoriser_coordonnees_courrier(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.memoriser_coordonnees_courrier(uuid, text, text, text, text, text) to authenticated;

-- 2. Premier mois à déclarer -------------------------------------------------
-- null : depuis le début du contrat (date_debut). Réglé par l'administrateur
-- (fiche du compte), modifiable par lui seul (droits administrateur existants).
alter table public.gestions add column if not exists declarations_depuis date;

-- 3. Événements signalés à Aide & Garde --------------------------------------
create table if not exists public.signalements (
  id             uuid primary key default gen_random_uuid(),
  gestion_id     uuid not null references public.gestions(id) on delete cascade,
  employeur_id   uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('fin_contrat', 'accident_travail', 'arret_maladie')),
  -- Fin de contrat : licenciement, rupture_conventionnelle, demission, retraite.
  precision      text not null default '',
  date_evenement date,
  commentaire    text not null default '',
  statut         text not null default 'envoyee' check (statut in ('envoyee', 'traitee')),
  created_at     timestamptz not null default now(),
  traitee_le     timestamptz,
  reponse_admin  text
);

create index if not exists signalements_gestion_idx on public.signalements (gestion_id);
create index if not exists signalements_a_traiter_idx
  on public.signalements (created_at) where statut = 'envoyee';
-- Un seul signalement en attente par gestion et par type.
create unique index if not exists signalements_un_en_attente
  on public.signalements (gestion_id, type) where statut = 'envoyee';

alter table public.signalements enable row level security;
revoke all on public.signalements from anon, authenticated;
grant select on public.signalements to authenticated;
grant insert, update, delete on public.signalements to authenticated;

drop policy if exists signalements_select_own on public.signalements;
create policy signalements_select_own on public.signalements
  for select to authenticated
  using (employeur_id = (select auth.uid()));

drop policy if exists signalements_admin_all on public.signalements;
create policy signalements_admin_all on public.signalements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.signaler_evenement(
  p_gestion_id uuid,
  p_type text,
  p_precision text,
  p_date date,
  p_commentaire text
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
    raise exception 'Ce signalement ne peut concerner qu''une de vos gestions en cours.';
  end if;
  if p_type not in ('fin_contrat', 'accident_travail', 'arret_maladie') then
    raise exception 'Type de signalement inconnu.';
  end if;
  if p_type = 'fin_contrat'
     and coalesce(p_precision, '') not in ('licenciement', 'rupture_conventionnelle', 'demission', 'retraite') then
    raise exception 'Précisez le mode de fin de contrat.';
  end if;
  if p_date is null then
    raise exception 'Indiquez la date.';
  end if;
  if exists (
    select 1 from public.signalements
     where gestion_id = p_gestion_id and type = p_type and statut = 'envoyee'
  ) then
    raise exception 'Aide & Garde a déjà été prévenue ; nous traitons votre demande.';
  end if;

  insert into public.signalements (gestion_id, employeur_id, type, precision, date_evenement, commentaire)
  values (
    p_gestion_id, v_uid, p_type,
    case when p_type = 'fin_contrat' then p_precision else '' end,
    p_date, left(trim(coalesce(p_commentaire, '')), 2000)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.signaler_evenement(uuid, text, text, date, text) from public, anon;
grant execute on function public.signaler_evenement(uuid, text, text, date, text) to authenticated;
