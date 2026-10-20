-- ============================================================================
-- Brique 3c — corrections de l'envoi d'une gestion (recette du 20/10/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3b
-- (peut être relancé sans danger).
--
-- 1. Bug : quand un champ obligatoire manquait, l'envoi échouait avec une
--    erreur technique (« L'enregistrement n'a pas abouti… ») au lieu de la
--    liste des champs à compléter. Cause : en SQL, ajouter un texte à une
--    liste avec « liste || 'texte' » est compris comme l'ajout d'une AUTRE
--    liste, et le texte n'est pas une liste valide. Remplacé par
--    array_append(), sans ambiguïté.
-- 2. Quota : message adressé à l'abonné (et non à l'administrateur), vérifié
--    avant l'envoi.
-- 3. Un brouillon peut être enregistré sans le nom du salarié ; le nom est
--    exigé à l'envoi.
-- ============================================================================

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
  p_precisions text
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
  if p_type_gestion not in ('garde_enfants', 'aide_domicile', 'employe_maison') then
    raise exception 'Type d''emploi inconnu.';
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
      salaire_horaire_net, precisions)
    values (
      v_uid, v_abo, 'brouillon', p_type_gestion, coalesce(trim(p_prenom), ''), coalesce(trim(p_nom), ''),
      coalesce(p_date_debut, current_date), p_type_contrat, p_date_fin_prevue, p_heures,
      p_unite_heures, p_salaire_horaire_net, coalesce(p_precisions, ''))
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
    precisions = coalesce(p_precisions, '')
  where id = p_id and employeur_id = v_uid and statut = 'brouillon'
  returning id into v_id;
  if v_id is null then
    raise exception 'Cette gestion n''est plus un brouillon : elle ne peut plus être modifiée ici.';
  end if;
  return v_id;
end;
$$;

create or replace function public.gestion_envoyer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_g      public.gestions%rowtype;
  v_manque text[] := array[]::text[];
  v_quota  integer;
  v_places integer;
begin
  select * into v_g from public.gestions
   where id = p_id and employeur_id = (select auth.uid()) and statut = 'brouillon';
  if not found then
    raise exception 'Gestion introuvable ou déjà envoyée.';
  end if;

  if coalesce(v_g.nom_salarie, '') = '' then
    v_manque := array_append(v_manque, 'le nom du salarié');
  end if;
  if coalesce(v_g.prenom_salarie, '') = '' then
    v_manque := array_append(v_manque, 'le prénom du salarié');
  end if;
  if v_g.type_contrat is null then
    v_manque := array_append(v_manque, 'le type de contrat (CDI ou CDD)');
  end if;
  if v_g.type_contrat = 'CDD' and v_g.date_fin_prevue is null then
    v_manque := array_append(v_manque, 'la date de fin du CDD');
  end if;
  if v_g.heures is null or v_g.unite_heures is null then
    v_manque := array_append(v_manque, 'la durée de travail');
  end if;
  if v_g.salaire_horaire_net is null then
    v_manque := array_append(v_manque, 'le salaire horaire net');
  end if;
  if cardinality(v_manque) > 0 then
    raise exception 'Avant d''envoyer, complétez : %.', array_to_string(v_manque, ', ');
  end if;
  if v_g.type_contrat = 'CDD' and v_g.date_fin_prevue <= v_g.date_debut then
    raise exception 'La date de fin du CDD doit être postérieure à la date de début.';
  end if;

  -- Quota, avec un message destiné à l'abonné (le trigger
  -- gestions_check_quota reste le garde-fou final).
  select quota_gestions into v_quota from public.abonnements
   where employeur_id = v_g.employeur_id and statut = 'actif';
  if v_quota is null then
    raise exception 'Votre abonnement n''est pas actif : contactez Aide & Garde pour envoyer cette gestion.';
  end if;
  select count(*) into v_places from public.gestions
   where employeur_id = v_g.employeur_id and statut in ('envoyee', 'en_cours');
  if v_places >= v_quota then
    raise exception 'Votre abonnement permet % gestion(s) et elles sont toutes utilisées (% en cours ou en attente de validation). Votre brouillon est conservé : terminez une gestion, ou contactez Aide & Garde pour faire évoluer votre abonnement.',
      v_quota, v_places;
  end if;

  update public.gestions
     set statut = 'envoyee', envoyee_le = now(), motif_retour = null
   where id = p_id;
end;
$$;
