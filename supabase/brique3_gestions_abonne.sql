-- ============================================================================
-- Brique 3 — l'abonné crée lui-même ses gestions
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique9b
-- (peut être relancé sans danger).
--
-- Cycle de vie d'une gestion (décision de Frédéric du 20/10/2026) :
--
--   brouillon ──(abonné : Envoyer)──▶ envoyee ──(admin : Valider)──▶ en_cours ──▶ terminee
--       ▲                               │
--       └──(abonné : Annuler l'envoi / admin : Renvoyer à compléter)──┘
--
-- - brouillon : l'abonné saisit et modifie librement ; ne compte pas dans
--   le quota de l'abonnement (5 brouillons au plus en même temps).
-- - envoyee   : l'abonné ne modifie plus ; la gestion RÉSERVE une place du
--   quota ; elle attend la validation d'Aide & Garde.
-- - en_cours / terminee : inchangés.
--
-- Toutes les écritures de l'abonné passent par des fonctions de la base
-- (ci-dessous) qui vérifient elles-mêmes qui fait quoi : l'abonné n'a
-- toujours aucun droit d'écriture directe sur la table des gestions.
-- ============================================================================

-- 1. Nouveaux statuts ---------------------------------------------------------
alter table public.gestions drop constraint if exists gestions_statut_check;
alter table public.gestions
  add constraint gestions_statut_check
  check (statut in ('brouillon', 'envoyee', 'en_cours', 'terminee'));

-- 2. Informations du contrat (« noyau typé » : champs dont le système a
--    besoin pour raisonner ; le reste ira dans `config`, voir
--    Champs_gestion_et_modele_configurable.md) ---------------------------------
alter table public.gestions add column if not exists type_contrat text
  check (type_contrat is null or type_contrat in ('CDI', 'CDD'));
alter table public.gestions add column if not exists date_fin_prevue date;
alter table public.gestions add column if not exists heures numeric(6, 2)
  check (heures is null or (heures > 0 and heures <= 300));
alter table public.gestions add column if not exists unite_heures text
  check (unite_heures is null or unite_heures in ('semaine', 'mois'));
alter table public.gestions add column if not exists salaire_horaire_net numeric(7, 2)
  check (salaire_horaire_net is null or (salaire_horaire_net > 0 and salaire_horaire_net < 1000));
alter table public.gestions add column if not exists precisions text not null default '';
alter table public.gestions add column if not exists envoyee_le timestamptz;
alter table public.gestions add column if not exists validee_le timestamptz;
alter table public.gestions add column if not exists motif_retour text;

-- 3. Quota : une gestion envoyée réserve déjà sa place -------------------------
create or replace function public.check_gestion_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abo   public.abonnements%rowtype;
  v_count integer;
  v_ouvre boolean := false;
begin
  select * into v_abo from public.abonnements where id = new.abonnement_id;
  if not found then
    raise exception 'Abonnement introuvable.';
  end if;
  if v_abo.employeur_id <> new.employeur_id then
    raise exception 'La gestion doit appartenir au même employeur que son abonnement.';
  end if;

  -- Vérifié quand la gestion entre dans le quota (envoyée ou en cours)
  -- alors qu'elle n'y était pas.
  if new.statut in ('envoyee', 'en_cours') then
    if tg_op = 'INSERT' then
      v_ouvre := true;
    elsif old.statut not in ('envoyee', 'en_cours') then
      v_ouvre := true;
    end if;
  end if;

  if v_ouvre then
    if v_abo.statut <> 'actif' then
      raise exception 'Abonnement résilié : impossible d''ouvrir une gestion.';
    end if;
    select count(*) into v_count
      from public.gestions
     where abonnement_id = new.abonnement_id
       and statut in ('envoyee', 'en_cours')
       and id <> new.id;
    if v_count >= v_abo.quota_gestions then
      raise exception 'Quota atteint : % gestion(s) en cours ou en attente de validation pour un quota de %. Terminez une gestion ou contactez Aide & Garde pour augmenter votre abonnement.',
        v_count, v_abo.quota_gestions;
    end if;
  end if;
  return new;
end;
$$;

-- 4. Fonctions utilisées par l'abonné -----------------------------------------

-- Créer (p_id vide) ou modifier un brouillon. Renvoie l'identifiant.
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
  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Indiquez au moins le nom du salarié pour enregistrer.';
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
      raise exception 'Vous avez déjà 5 brouillons : terminez-en ou supprimez-en un avant d''en créer un autre.';
    end if;
    insert into public.gestions (
      employeur_id, abonnement_id, statut, type_gestion, prenom_salarie, nom_salarie,
      date_debut, type_contrat, date_fin_prevue, heures, unite_heures,
      salaire_horaire_net, precisions)
    values (
      v_uid, v_abo, 'brouillon', p_type_gestion, coalesce(trim(p_prenom), ''), trim(p_nom),
      coalesce(p_date_debut, current_date), p_type_contrat, p_date_fin_prevue, p_heures,
      p_unite_heures, p_salaire_horaire_net, coalesce(p_precisions, ''))
    returning id into v_id;
    return v_id;
  end if;

  update public.gestions set
    type_gestion = p_type_gestion,
    prenom_salarie = coalesce(trim(p_prenom), ''),
    nom_salarie = trim(p_nom),
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

-- Envoyer un brouillon complet à Aide & Garde.
create or replace function public.gestion_envoyer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_g public.gestions%rowtype;
  v_manque text[] := '{}';
begin
  select * into v_g from public.gestions
   where id = p_id and employeur_id = (select auth.uid()) and statut = 'brouillon';
  if not found then
    raise exception 'Gestion introuvable ou déjà envoyée.';
  end if;

  if coalesce(v_g.prenom_salarie, '') = '' then v_manque := v_manque || 'le prénom du salarié'; end if;
  if v_g.type_contrat is null then v_manque := v_manque || 'le type de contrat'; end if;
  if v_g.type_contrat = 'CDD' and v_g.date_fin_prevue is null then
    v_manque := v_manque || 'la date de fin du CDD';
  end if;
  if v_g.heures is null or v_g.unite_heures is null then
    v_manque := v_manque || 'le nombre d''heures';
  end if;
  if v_g.salaire_horaire_net is null then v_manque := v_manque || 'le salaire horaire net'; end if;
  if array_length(v_manque, 1) > 0 then
    raise exception 'Avant d''envoyer, complétez : %.', array_to_string(v_manque, ', ');
  end if;
  if v_g.type_contrat = 'CDD' and v_g.date_fin_prevue <= v_g.date_debut then
    raise exception 'La date de fin du CDD doit être postérieure à la date de début.';
  end if;

  -- Le contrôle du quota est fait par le trigger gestions_check_quota.
  update public.gestions
     set statut = 'envoyee', envoyee_le = now(), motif_retour = null
   where id = p_id;
end;
$$;

-- Reprendre une gestion envoyée (pas encore validée) pour la modifier.
create or replace function public.gestion_annuler_envoi(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.gestions
     set statut = 'brouillon', envoyee_le = null
   where id = p_id and employeur_id = (select auth.uid()) and statut = 'envoyee';
  if not found then
    raise exception 'Cette gestion a déjà été validée par Aide & Garde : contactez-nous pour la modifier.';
  end if;
end;
$$;

-- Supprimer un brouillon.
create or replace function public.gestion_supprimer_brouillon(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.gestions
   where id = p_id and employeur_id = (select auth.uid()) and statut = 'brouillon';
  if not found then
    raise exception 'Seul un brouillon peut être supprimé.';
  end if;
end;
$$;

revoke all on function public.gestion_enregistrer_brouillon(uuid, text, text, text, date, text, date, numeric, text, numeric, text) from public, anon;
revoke all on function public.gestion_envoyer(uuid) from public, anon;
revoke all on function public.gestion_annuler_envoi(uuid) from public, anon;
revoke all on function public.gestion_supprimer_brouillon(uuid) from public, anon;
grant execute on function public.gestion_enregistrer_brouillon(uuid, text, text, text, date, text, date, numeric, text, numeric, text) to authenticated;
grant execute on function public.gestion_envoyer(uuid) to authenticated;
grant execute on function public.gestion_annuler_envoi(uuid) to authenticated;
grant execute on function public.gestion_supprimer_brouillon(uuid) to authenticated;

-- 5. Recherche rapide des gestions à valider (espace admin) -------------------
create index if not exists gestions_a_valider_idx
  on public.gestions (envoyee_le) where statut = 'envoyee';
