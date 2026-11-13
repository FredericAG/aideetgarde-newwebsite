-- ============================================================================
-- Brique 3i — Accident de trajet, congé paternité, demande de réouverture
-- (12/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3h. Peut être
-- relancé sans danger.
--
-- Trois nouveaux événements que l'abonné signale à Aide & Garde :
-- 1. « accident_trajet » : accident sur le trajet domicile – travail
--    (gestion en cours) ;
-- 2. « conge_paternite » : congé de paternité et d'accueil de l'enfant
--    (gestion en cours) ;
-- 3. « reouverture » : l'abonné demande de rouvrir une gestion TERMINÉE.
--    Aide & Garde la rouvre (bouton « Rouvrir » de la fiche du compte, qui
--    clôt aussi la demande) ou répond sans la rouvrir.
-- ============================================================================

alter table public.signalements drop constraint if exists signalements_type_check;
alter table public.signalements add constraint signalements_type_check
  check (type in (
    'fin_contrat', 'accident_travail', 'accident_trajet', 'arret_maladie',
    'conge_maternite', 'conge_paternite', 'reouverture'
  ));

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
  v_statut_attendu text := case when p_type = 'reouverture' then 'terminee' else 'en_cours' end;
begin
  if p_type not in (
    'fin_contrat', 'accident_travail', 'accident_trajet', 'arret_maladie',
    'conge_maternite', 'conge_paternite', 'reouverture'
  ) then
    raise exception 'Type de signalement inconnu.';
  end if;
  if not exists (
    select 1 from public.gestions
     where id = p_gestion_id and employeur_id = v_uid and statut = v_statut_attendu
  ) then
    if p_type = 'reouverture' then
      raise exception 'Seule une de vos gestions terminées peut être rouverte.';
    end if;
    raise exception 'Ce signalement ne peut concerner qu''une de vos gestions en cours.';
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
