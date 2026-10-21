-- ============================================================================
-- Brique 7d — Clore une demande sans suite, avec un commentaire pour l'abonné
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique7b et brique3b.
-- Peut être relancé sans danger.
--
-- Demande de Frédéric (21/10) : pouvoir « solder » une demande sans
-- forcément faire ce qui est demandé, avec un commentaire facultatif
-- adressé à l'abonné :
--  - demande de modification d'un bulletin refusée : le bulletin en ligne
--    reste le bon, la déclaration redevient « traitée » ;
--  - déclaration du mois close sans bulletin (doublon, mois sans
--    travail…) : statut « close » ;
--  - demande d'avenant close sans avenant : statut « close ».
-- La réponse est enregistrée et affichée à l'abonné.
-- ============================================================================

-- 1. Déclarations du mois ------------------------------------------------------
alter table public.declarations_mensuelles
  add column if not exists reponse_admin text,
  add column if not exists cloturee_le   timestamptz;

alter table public.declarations_mensuelles
  drop constraint if exists declarations_mensuelles_statut_check;
alter table public.declarations_mensuelles
  add constraint declarations_mensuelles_statut_check
  check (statut in ('envoyee', 'traitee', 'modification', 'close'));

-- Seul l'administrateur clôt, par cette fonction (l'abonné n'a aucun droit
-- d'écriture sur le statut). Renvoie le statut d'origine :
-- 'modification' (demande refusée) ou 'envoyee' (déclaration close).
create or replace function public.clore_declaration(p_id uuid, p_commentaire text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avant text;
  v_commentaire text := nullif(left(btrim(coalesce(p_commentaire, '')), 2000), '');
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administration.';
  end if;

  select statut into v_avant from public.declarations_mensuelles where id = p_id for update;
  if not found then
    raise exception 'Demande introuvable.';
  end if;
  if v_avant not in ('envoyee', 'modification') then
    raise exception 'Cette demande est déjà traitée.';
  end if;

  update public.declarations_mensuelles
     set statut = case when v_avant = 'modification' then 'traitee' else 'close' end,
         reponse_admin = v_commentaire,
         cloturee_le = now(),
         traitee_le = case when v_avant = 'modification' then traitee_le else now() end
   where id = p_id;
  return v_avant;
end;
$$;

revoke all on function public.clore_declaration(uuid, text) from public, anon;
grant execute on function public.clore_declaration(uuid, text) to authenticated;

-- Une nouvelle demande de modification efface la réponse précédente.
create or replace function public.effacer_reponse_declaration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.statut = 'modification' and old.statut <> 'modification' then
    new.reponse_admin := null;
    new.cloturee_le := null;
  end if;
  return new;
end;
$$;

drop trigger if exists declarations_effacer_reponse on public.declarations_mensuelles;
create trigger declarations_effacer_reponse
  before update on public.declarations_mensuelles
  for each row execute function public.effacer_reponse_declaration();

-- 2. Demandes d'avenant ----------------------------------------------------------
alter table public.demandes_avenant
  add column if not exists reponse_admin text;

alter table public.demandes_avenant
  drop constraint if exists demandes_avenant_statut_check;
alter table public.demandes_avenant
  add constraint demandes_avenant_statut_check
  check (statut in ('envoyee', 'traitee', 'close'));
