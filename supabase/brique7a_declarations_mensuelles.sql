-- ============================================================================
-- Brique 7a — déclaration mensuelle de l'abonné (première version)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2f.
-- Peut être relancé sans danger.
--
-- Pour chaque gestion et chaque mois, l'abonné envoie une déclaration :
-- nombre d'heures travaillées (facultatif, par ex. pour un salarié
-- mensualisé sans changement) et un commentaire libre. L'envoi vaut
-- signal « le bulletin de ce mois peut être établi ».
--
-- Cycle : envoyée (modifiable par l'abonné) → traitée (verrouillée).
-- Elle passe AUTOMATIQUEMENT à « traitée » quand l'administrateur dépose
-- le bulletin de salaire du même mois pour la même gestion.
--
-- Première version volontairement simple : le contenu complet d'une
-- déclaration (heures majorées, absences, congés, frais...) sera défini
-- avec Frédéric dans la brique 7 ; la colonne `details` (JSONB) est
-- réservée à cet usage.
-- ============================================================================

create table if not exists public.declarations_mensuelles (
  id            uuid primary key default gen_random_uuid(),
  gestion_id    uuid not null references public.gestions(id) on delete cascade,
  employeur_id  uuid not null references public.profiles(id) on delete cascade,
  periode       text not null check (periode ~ '^[0-9]{2}(0[1-9]|1[0-2])$'),  -- AAMM
  heures        numeric(6, 2) check (heures is null or (heures >= 0 and heures <= 744)),
  commentaire   text not null default '' check (char_length(commentaire) <= 2000),
  details       jsonb not null default '{}'::jsonb,
  statut        text not null default 'envoyee' check (statut in ('envoyee', 'traitee')),
  envoyee_le    timestamptz not null default now(),
  traitee_le    timestamptz,
  created_at    timestamptz not null default now(),
  unique (gestion_id, periode)
);

create index if not exists declarations_employeur_idx on public.declarations_mensuelles (employeur_id);
create index if not exists declarations_a_traiter_idx
  on public.declarations_mensuelles (envoyee_le) where statut = 'envoyee';

-- Avant enregistrement : employeur recopié depuis la gestion, contrôles
-- métier, date d'envoi mise à jour à chaque modification.
create or replace function public.preparer_declaration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gestion public.gestions%rowtype;
begin
  select * into v_gestion from public.gestions where id = new.gestion_id;
  if not found then
    raise exception 'Gestion introuvable.';
  end if;
  new.employeur_id := v_gestion.employeur_id;

  if tg_op = 'INSERT' then
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
    -- Une déclaration traitée ne se modifie plus (sauf par le passage
    -- automatique ci-dessous, qui ne touche qu'au statut).
    if old.statut = 'traitee'
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

drop trigger if exists declarations_preparer on public.declarations_mensuelles;
create trigger declarations_preparer
  before insert or update on public.declarations_mensuelles
  for each row execute function public.preparer_declaration();

-- Dépôt d'un bulletin → la déclaration du même mois passe à « traitée ».
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
       and statut = 'envoyee';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_marquer_declaration on public.documents;
create trigger documents_marquer_declaration
  after insert on public.documents
  for each row execute function public.marquer_declaration_traitee();

-- Sécurité.
alter table public.declarations_mensuelles enable row level security;
revoke all on public.declarations_mensuelles from anon, authenticated;
grant select, delete on public.declarations_mensuelles to authenticated;
-- L'abonné ne peut écrire QUE ces colonnes : jamais le statut.
grant insert (gestion_id, periode, heures, commentaire, details)
  on public.declarations_mensuelles to authenticated;
grant update (heures, commentaire, details)
  on public.declarations_mensuelles to authenticated;

drop policy if exists declarations_select_own on public.declarations_mensuelles;
create policy declarations_select_own on public.declarations_mensuelles
  for select to authenticated
  using (employeur_id = (select auth.uid()));

drop policy if exists declarations_insert_own on public.declarations_mensuelles;
create policy declarations_insert_own on public.declarations_mensuelles
  for insert to authenticated
  with check (employeur_id = (select auth.uid()));

drop policy if exists declarations_update_own on public.declarations_mensuelles;
create policy declarations_update_own on public.declarations_mensuelles
  for update to authenticated
  using (employeur_id = (select auth.uid()) and statut = 'envoyee')
  with check (employeur_id = (select auth.uid()));

drop policy if exists declarations_admin_select on public.declarations_mensuelles;
create policy declarations_admin_select on public.declarations_mensuelles
  for select to authenticated
  using (public.is_admin());

drop policy if exists declarations_admin_delete on public.declarations_mensuelles;
create policy declarations_admin_delete on public.declarations_mensuelles
  for delete to authenticated
  using (public.is_admin());
