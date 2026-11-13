-- ============================================================================
-- Brique 3j — Brouillon de gestion sans abonnement (13/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique11. Peut être
-- relancé sans danger.
--
-- Décision du 13/11 (audit T7, Cadre stratégique) : l'inscrit remplit le
-- formulaire de son salarié AVANT de choisir sa formule ; le paiement est
-- demandé à l'envoi. Un brouillon peut donc n'être rattaché à aucun
-- abonnement : il l'est automatiquement quand il est envoyé.
-- ============================================================================

alter table public.gestions alter column abonnement_id drop not null;

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
  -- Brouillon sans abonnement (13/11/2026) : aucun contrôle tant qu'il
  -- n'entre pas dans le quota ; il est rattaché à l'abonnement actif à
  -- l'envoi, plus bas.
  if new.abonnement_id is null then
    if new.statut not in ('envoyee', 'en_cours') then
      return new;
    end if;
  else
    select * into v_abo from public.abonnements where id = new.abonnement_id;
    if not found then
      raise exception 'Abonnement introuvable.';
    end if;
  end if;
  if new.abonnement_id is not null and v_abo.employeur_id <> new.employeur_id then
    raise exception 'La gestion doit appartenir au même employeur que son abonnement.';
  end if;

  -- Contrôle à chaque passage vers « envoyée » ou « en cours » (création,
  -- envoi, validation, réouverture).
  if new.statut in ('envoyee', 'en_cours')
     and (tg_op = 'INSERT' or old.statut is distinct from new.statut
          or old.remplace_gestion_id is distinct from new.remplace_gestion_id) then

    select * into v_actif from public.abonnements
     where employeur_id = new.employeur_id and statut = 'actif';
    if not found then
      raise exception 'Aucun abonnement actif : impossible d''ouvrir ou de valider une gestion.';
    end if;
    -- La gestion est rattachée à l'abonnement actif.
    new.abonnement_id := v_actif.id;

    -- CDD de remplacement : hors quota (brique 3d).
    if new.remplace_gestion_id is not null then
      return new;
    end if;

    select count(*) into v_count
      from public.gestions
     where employeur_id = new.employeur_id
       and statut in ('envoyee', 'en_cours')
       and id <> new.id
       and remplace_gestion_id is null
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
    -- Sans abonnement, le brouillon est permis (13/11/2026) : la formule
    -- est demandée à l'envoi.
    select id into v_abo from public.abonnements
     where employeur_id = v_uid and statut = 'actif';
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
  if v_g.remplace_gestion_id is not null and v_g.type_contrat is distinct from 'CDD' then
    v_manque := array_append(v_manque, 'un contrat CDD (un remplacement se fait en CDD)');
  end if;
  -- Un CDD de remplacement peut finir au retour du salarié absent (terme
  -- imprécis) : sa date de fin est alors facultative.
  if v_g.type_contrat = 'CDD' and v_g.date_fin_prevue is null and v_g.remplace_gestion_id is null then
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
    -- Message reconnu par le site (« formule ») : il affiche le bouton
    -- « Choisir ma formule », et revient sur ce brouillon après le paiement.
    raise exception 'Pour envoyer cette gestion, choisissez d''abord votre formule. Votre brouillon est conservé.';
  end if;
  select count(*) into v_places from public.gestions
   where employeur_id = v_g.employeur_id and statut in ('envoyee', 'en_cours')
     and remplace_gestion_id is null;
  if v_g.remplace_gestion_id is null and v_places >= v_quota then
    raise exception 'Votre abonnement permet % gestion(s) et elles sont toutes utilisées (% en cours ou en attente de validation). Votre brouillon est conservé : terminez une gestion, ou contactez Aide & Garde pour faire évoluer votre abonnement.',
      v_quota, v_places;
  end if;

  update public.gestions
     set statut = 'envoyee', envoyee_le = now(), motif_retour = null
   where id = p_id;
end;
$$;

revoke all on function public.gestion_enregistrer_brouillon(uuid, text, text, text, date, text, date, numeric, text, numeric, text, uuid, text) from public, anon;
grant execute on function public.gestion_enregistrer_brouillon(uuid, text, text, text, date, text, date, numeric, text, numeric, text, uuid, text) to authenticated;
revoke all on function public.gestion_envoyer(uuid) from public, anon;
grant execute on function public.gestion_envoyer(uuid) to authenticated;

-- Registre des scripts (brique13) : ce script s'inscrit s'il est déjà en place.
do $$
begin
  if to_regclass('public.scripts_sql') is not null then
    insert into public.scripts_sql (nom) values ('brique3j_brouillon_sans_abonnement') on conflict (nom) do nothing;
  end if;
end;
$$;
