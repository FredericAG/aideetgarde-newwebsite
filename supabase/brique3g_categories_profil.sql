-- ============================================================================
-- Brique 3g — Catégories d'emploi de la classification 2026, profil de
-- l'employeur, congé maternité (25/10/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3f. Peut être
-- relancé sans danger.
--
-- 1. Deux catégories d'emploi s'ajoutent aux trois existantes, d'après les
--    domaines de la classification de la convention collective IDCC 3239
--    (en vigueur au 1er janvier 2026) : « environnement technique » (cours,
--    secrétariat, informatique, compagnie) et « environnement externe »
--    (jardinage, petits travaux, gardiennage).
-- 2. Profil de l'employeur complété une fois, pas à l'inscription : civilité
--    (déjà là, brique 3e) et date de naissance, demandées avant la première
--    gestion et modifiables dans Mon compte.
-- 3. « Déclarer un congé maternité » : nouveau type d'événement signalé.
-- ============================================================================

-- 1. Catégories d'emploi ------------------------------------------------------
alter table public.gestions drop constraint if exists gestions_type_gestion_check;
alter table public.gestions add constraint gestions_type_gestion_check
  check (type_gestion in ('garde_enfants', 'aide_domicile', 'employe_maison', 'environnement_technique', 'environnement_externe'));

create or replace function public.gestion_enregistrer_brouillon(
  p_id uuid,
  p_type_gestion text,
  p_prenom text,
  p_nom text,
  p_date_debut date,
  p_type_contrat text,
  p_date_fin_prevue date,
  p_heures numeric,
  p_unite_heures text,
  p_salaire_horaire_net numeric,
  p_precisions text,
  p_remplace_gestion_id uuid default null,
  p_motif_remplacement text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_abo uuid;
  v_id  uuid;
  v_nb  integer;
begin
  if v_uid is null then
    raise exception 'Session expirée, reconnectez-vous.';
  end if;
  if p_type_gestion not in ('garde_enfants', 'aide_domicile', 'employe_maison', 'environnement_technique', 'environnement_externe') then
    raise exception 'Type d''emploi inconnu.';
  end if;
  if (p_remplace_gestion_id is null) <> (p_motif_remplacement is null) then
    raise exception 'Pour un CDD de remplacement, indiquez le salarié remplacé et le motif de son absence.';
  end if;

  if p_id is null then
    select id into v_abo from public.abonnements
     where employeur_id = v_uid and statut = 'actif';
    if v_abo is null then
      raise exception 'Il faut un abonnement actif pour créer une gestion. Contactez Aide & Garde.';
    end if;
    select count(*) into v_nb from public.gestions
     where employeur_id = v_uid and statut = 'brouillon';
    if v_nb >= 5 then
      raise exception 'Vous avez déjà 5 brouillons : envoyez-en ou supprimez-en un avant d''en créer un autre.';
    end if;
    insert into public.gestions (
      employeur_id, abonnement_id, statut, type_gestion, prenom_salarie, nom_salarie,
      date_debut, type_contrat, date_fin_prevue, heures, unite_heures,
      salaire_horaire_net, precisions, remplace_gestion_id, motif_remplacement)
    values (
      v_uid, v_abo, 'brouillon', p_type_gestion, coalesce(trim(p_prenom), ''), coalesce(trim(p_nom), ''),
      coalesce(p_date_debut, current_date), p_type_contrat, p_date_fin_prevue, p_heures,
      p_unite_heures, p_salaire_horaire_net, coalesce(p_precisions, ''),
      p_remplace_gestion_id, p_motif_remplacement)
    returning id into v_id;
    return v_id;
  end if;

  update public.gestions set
    type_gestion = p_type_gestion,
    prenom_salarie = coalesce(trim(p_prenom), ''),
    nom_salarie = coalesce(trim(p_nom), ''),
    date_debut = coalesce(p_date_debut, date_debut),
    type_contrat = p_type_contrat,
    date_fin_prevue = p_date_fin_prevue,
    heures = p_heures,
    unite_heures = p_unite_heures,
    salaire_horaire_net = p_salaire_horaire_net,
    precisions = coalesce(p_precisions, ''),
    remplace_gestion_id = p_remplace_gestion_id,
    motif_remplacement = p_motif_remplacement
  where id = p_id and employeur_id = v_uid and statut = 'brouillon'
  returning id into v_id;
  if v_id is null then
    raise exception 'Cette gestion n''est plus un brouillon : elle ne peut plus être modifiée ici.';
  end if;
  return v_id;
end;
$$;

-- 2. Profil de l'employeur ----------------------------------------------------
alter table public.profiles add column if not exists date_naissance date;

create or replace function public.completer_profil(
  p_civilite text,
  p_date_naissance date
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Session expirée, reconnectez-vous.';
  end if;
  if coalesce(p_civilite, '') not in ('', 'Madame', 'Monsieur') then
    raise exception 'Civilité inconnue.';
  end if;
  if p_date_naissance is not null
     and (p_date_naissance > current_date - interval '16 years' or p_date_naissance < date '1900-01-01') then
    raise exception 'Vérifiez la date de naissance.';
  end if;
  update public.profiles
     set civilite = coalesce(p_civilite, ''),
         date_naissance = p_date_naissance
   where id = (select auth.uid());
end;
$$;

revoke all on function public.completer_profil(text, date) from public, anon;
grant execute on function public.completer_profil(text, date) to authenticated;

-- 3. Congé maternité ----------------------------------------------------------
alter table public.signalements drop constraint if exists signalements_type_check;
alter table public.signalements add constraint signalements_type_check
  check (type in ('fin_contrat', 'accident_travail', 'arret_maladie', 'conge_maternite'));

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
  if p_type not in ('fin_contrat', 'accident_travail', 'arret_maladie', 'conge_maternite') then
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
