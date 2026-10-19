-- ============================================================================
-- Brique 7b — demande de modification d'un bulletin par l'abonné
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique9a.
-- Peut être relancé sans danger.
--
-- 1. Nouveau statut de déclaration « modification » : l'abonné signale
--    qu'un bulletin en ligne doit être corrigé (motif obligatoire). La
--    déclaration revient dans la liste « à traiter » de l'administrateur.
-- 2. Le dépôt du bulletin corrigé (remplacement) la repasse en « traitée ».
-- 3. Correction d'une incohérence : si l'administrateur SUPPRIME le bulletin
--    d'un mois, la déclaration de ce mois redevient « à traiter » (avant, elle
--    restait « traitée » alors qu'aucun bulletin n'était plus en ligne).
-- ============================================================================

alter table public.declarations_mensuelles
  add column if not exists motif_modification text,
  add column if not exists modification_demandee_le timestamptz;

alter table public.declarations_mensuelles
  drop constraint if exists declarations_mensuelles_statut_check;
alter table public.declarations_mensuelles
  add constraint declarations_mensuelles_statut_check
  check (statut in ('envoyee', 'traitee', 'modification'));

drop index if exists public.declarations_a_traiter_idx;
create index if not exists declarations_a_traiter_idx
  on public.declarations_mensuelles (envoyee_le) where statut in ('envoyee', 'modification');

-- Le contrôle d'enregistrement laisse passer la création d'une déclaration
-- « modification » quand elle vient de la fonction dédiée ci-dessous.
create or replace function public.preparer_declaration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gestion public.gestions%rowtype;
  v_par_fonction boolean := coalesce(current_setting('app.demande_modification', true), '') = 'oui';
begin
  select * into v_gestion from public.gestions where id = new.gestion_id;
  if not found then
    raise exception 'Gestion introuvable.';
  end if;
  new.employeur_id := v_gestion.employeur_id;

  if tg_op = 'INSERT' then
    if v_par_fonction then
      return new;
    end if;
    if v_gestion.statut <> 'en_cours' then
      raise exception 'Cette gestion est terminée : impossible d''envoyer une déclaration.';
    end if;
    if exists (
      select 1 from public.documents
      where gestion_id = new.gestion_id
        and type_document = 'bulletin'
        and periode = new.periode
    ) then
      raise exception 'Le bulletin de ce mois est déjà en ligne : la déclaration n''est plus nécessaire.';
    end if;
    new.statut := 'envoyee';
    new.traitee_le := null;
  else
    if old.statut <> 'envoyee'
       and (new.heures is distinct from old.heures
            or new.commentaire is distinct from old.commentaire
            or new.details is distinct from old.details) then
      raise exception 'Le bulletin de ce mois a déjà été établi : la déclaration ne peut plus être modifiée.';
    end if;
    if new.heures is distinct from old.heures
       or new.commentaire is distinct from old.commentaire
       or new.details is distinct from old.details then
      new.envoyee_le := now();
    end if;
  end if;
  return new;
end;
$$;

-- Demande de modification par l'abonné (seule façon pour lui de changer un
-- statut). Fonctionne aussi pour un bulletin déposé sans déclaration.
create or replace function public.demander_modification_bulletin(
  p_gestion_id uuid, p_periode text, p_motif text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motif text := btrim(coalesce(p_motif, ''));
begin
  if not exists (
    select 1 from public.gestions
    where id = p_gestion_id and employeur_id = (select auth.uid())
  ) then
    raise exception 'Gestion introuvable.';
  end if;
  if char_length(v_motif) < 3 then
    raise exception 'Merci d''indiquer ce qui doit être corrigé.';
  end if;
  if not exists (
    select 1 from public.documents
    where gestion_id = p_gestion_id and type_document = 'bulletin' and periode = p_periode
  ) then
    raise exception 'Aucun bulletin en ligne pour ce mois.';
  end if;

  perform set_config('app.demande_modification', 'oui', true);
  insert into public.declarations_mensuelles
    (gestion_id, periode, statut, motif_modification, modification_demandee_le)
  values
    (p_gestion_id, p_periode, 'modification', left(v_motif, 2000), now())
  on conflict (gestion_id, periode) do update
    set statut = 'modification',
        motif_modification = excluded.motif_modification,
        modification_demandee_le = now();
  perform set_config('app.demande_modification', '', true);
end;
$$;

revoke all on function public.demander_modification_bulletin(uuid, text, text) from public;
grant execute on function public.demander_modification_bulletin(uuid, text, text) to authenticated;

-- Dépôt OU remplacement d'un bulletin → déclaration du mois « traitée ».
create or replace function public.marquer_declaration_traitee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type_document = 'bulletin' and new.periode is not null then
    update public.declarations_mensuelles
       set statut = 'traitee', traitee_le = now()
     where gestion_id = new.gestion_id
       and periode = new.periode
       and statut in ('envoyee', 'modification');
  end if;
  return new;
end;
$$;

drop trigger if exists documents_marquer_declaration on public.documents;
create trigger documents_marquer_declaration
  after insert or update of storage_path on public.documents
  for each row execute function public.marquer_declaration_traitee();

-- Suppression d'un bulletin → la déclaration du mois redevient « à traiter ».
create or replace function public.rouvrir_declaration_si_bulletin_supprime()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.type_document = 'bulletin' and old.periode is not null then
    update public.declarations_mensuelles
       set statut = 'envoyee', traitee_le = null
     where gestion_id = old.gestion_id
       and periode = old.periode
       and statut = 'traitee';
  end if;
  return old;
end;
$$;

drop trigger if exists documents_rouvrir_declaration on public.documents;
create trigger documents_rouvrir_declaration
  after delete on public.documents
  for each row execute function public.rouvrir_declaration_si_bulletin_supprime();

-- Remise en cohérence des données existantes (cas observé le 20/10 :
-- déclaration « traitée » dont le bulletin a été supprimé).
update public.declarations_mensuelles d
   set statut = 'envoyee', traitee_le = null
 where d.statut = 'traitee'
   and not exists (
     select 1 from public.documents doc
     where doc.gestion_id = d.gestion_id
       and doc.type_document = 'bulletin'
       and doc.periode = d.periode
   );
