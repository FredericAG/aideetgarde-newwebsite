-- ============================================================================
-- Brique 3d — CDD de remplacement hors quota
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3c, PUIS
-- relancer brique2g_liste_comptes_admin.sql (comptage des places). Peut être
-- relancé sans danger.
--
-- Demande de Frédéric (23/10/2026) : une gestion ouverte pour remplacer un
-- salarié en congé maternité ou en arrêt maladie (CDD de remplacement)
-- s'ajoute aux gestions de l'abonnement SANS en occuper une place, donc sans
-- surcoût. Garde-fous :
--   - le salarié remplacé est une gestion EN COURS du même employeur, qui
--     n'est pas elle-même un remplacement ;
--   - un seul remplacement à la fois pour un même salarié absent ;
--   - le contrat est un CDD ; sa date de fin est facultative (fin au retour
--     du salarié absent) ;
--   - Aide & Garde valide la gestion comme toute autre (motif affiché).
-- ============================================================================

alter table public.gestions add column if not exists remplace_gestion_id uuid
  references public.gestions(id) on delete set null;
alter table public.gestions add column if not exists motif_remplacement text;

alter table public.gestions drop constraint if exists gestions_motif_remplacement_check;
alter table public.gestions add constraint gestions_motif_remplacement_check
  check (motif_remplacement in ('conge_maternite', 'arret_maladie'));
alter table public.gestions drop constraint if exists gestions_remplacement_complet;
alter table public.gestions add constraint gestions_remplacement_complet
  check (remplace_gestion_id is null or motif_remplacement is not null);
alter table public.gestions drop constraint if exists gestions_remplacement_pas_soi;
alter table public.gestions add constraint gestions_remplacement_pas_soi
  check (remplace_gestion_id is distinct from id);

-- Un seul remplacement actif (brouillon, envoyé ou en cours) par salarié absent.
create unique index if not exists gestions_un_remplacement_actif
  on public.gestions (remplace_gestion_id)
  where remplace_gestion_id is not null and statut in ('brouillon', 'envoyee', 'en_cours');

-- Contrôle du salarié remplacé -------------------------------------------------
create or replace function public.check_gestion_remplacement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.gestions%rowtype;
begin
  if new.remplace_gestion_id is null then
    return new;
  end if;
  -- Vérifié à la création, au changement de salarié remplacé, et à chaque
  -- entrée dans le quota (envoi, validation).
  if tg_op = 'INSERT'
     or old.remplace_gestion_id is distinct from new.remplace_gestion_id
     or (new.statut in ('envoyee', 'en_cours') and old.statut is distinct from new.statut) then
    select * into v_r from public.gestions where id = new.remplace_gestion_id;
    if not found or v_r.employeur_id <> new.employeur_id then
      raise exception 'Salarié remplacé introuvable.';
    end if;
    if v_r.remplace_gestion_id is not null then
      raise exception 'Le salarié remplacé est lui-même un remplaçant : choisissez le salarié absent.';
    end if;
    if v_r.statut <> 'en_cours' then
      raise exception 'Le salarié remplacé doit avoir une gestion en cours.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists gestions_check_remplacement on public.gestions;
create trigger gestions_check_remplacement
  before insert or update on public.gestions
  for each row execute function public.check_gestion_remplacement();

-- Quota : les remplacements n'occupent pas de place --------------------------
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
     where employeur_id = new.employeur_id and statut in ('envoyee', 'en_cours')
       and remplace_gestion_id is null;
    if new.quota_gestions < v_count then
      raise exception 'Quota trop bas : ce compte utilise déjà % place(s) (gestions en cours ou à valider). Terminez des gestions avant de baisser le quota.',
        v_count;
    end if;
  end if;
  return new;
end;
$$;

-- Fonctions de l'abonné ---------------------------------------------------------
drop function if exists public.gestion_enregistrer_brouillon(uuid, text, text, text, date, text, date, numeric, text, numeric, text);

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
  if p_type_gestion not in ('garde_enfants', 'aide_domicile', 'employe_maison') then
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
    raise exception 'Votre abonnement n''est pas actif : contactez Aide & Garde pour envoyer cette gestion.';
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
