-- ============================================================================
-- Brique 2 — noyau minimal de données (abonnement, gestions, documents)
-- + droits administrateur (back-office minimal)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS supabase/schema.sql
-- (brique 1). Le script peut être relancé sans danger (idempotent).
--
-- Principe : les règles métier qui ne doivent jamais être contournées
-- (quota de gestions, cohérence employeur/abonnement, qui voit quoi) sont
-- imposées par la base de données elle-même, pas seulement par le code du
-- site. Un bug de l'interface ne peut donc pas casser ces règles.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Qui est administrateur ?
-- ---------------------------------------------------------------------------
-- Fonction "security definer" : elle lit profiles avec les droits du
-- propriétaire, ce qui évite qu'une policy de profiles qui interroge
-- profiles ne se rappelle elle-même à l'infini.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Un administrateur peut LIRE tous les profils (liste des comptes).
-- Il ne peut pas en modifier : les modifications de profil restent
-- réservées au titulaire du compte (voir schema.sql).
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Abonnements
-- ---------------------------------------------------------------------------
-- Un abonnement = un forfait mensuel de l'employeur, qui donne droit à un
-- quota de gestions simultanées (décision 9). Résilier l'abonnement et
-- terminer une gestion sont deux actions distinctes (décision 4) : terminer
-- une gestion ne touche jamais à l'abonnement.
create table if not exists public.abonnements (
  id             uuid primary key default gen_random_uuid(),
  employeur_id   uuid not null references public.profiles(id) on delete cascade,
  statut         text not null default 'actif'
                   check (statut in ('actif', 'resilie')),
  quota_gestions integer not null default 4 check (quota_gestions > 0),
  tarif_mensuel  numeric(6, 2) not null default 12.90 check (tarif_mensuel >= 0),
  date_debut     date not null default current_date,
  date_fin       date,
  motif_fin      text,
  created_at     timestamptz not null default now()
);

-- Au plus un abonnement ACTIF par employeur (les anciens, résiliés, restent
-- consultables pour l'historique).
create unique index if not exists abonnements_un_actif_par_employeur
  on public.abonnements (employeur_id) where statut = 'actif';

-- ---------------------------------------------------------------------------
-- 3. Gestions
-- ---------------------------------------------------------------------------
-- Une gestion = un salarié employé par l'employeur (un dossier de paie).
-- "Noyau typé" : les champs communs à toutes les gestions sont de vraies
-- colonnes (fiables, filtrables). `config` (JSONB) est la couche
-- configurable décrite dans Champs_gestion_et_modele_configurable.md : elle
-- accueillera les champs variables (tarifs, horaires, conventions...) sans
-- migration de schéma. Elle reste vide à ce stade.
create table if not exists public.gestions (
  id             uuid primary key default gen_random_uuid(),
  employeur_id   uuid not null references public.profiles(id) on delete cascade,
  abonnement_id  uuid not null references public.abonnements(id) on delete cascade,
  type_gestion   text not null default 'garde_enfants'
                   check (type_gestion in ('garde_enfants', 'aide_domicile', 'employe_maison')),
  prenom_salarie text not null default '',
  nom_salarie    text not null,
  statut         text not null default 'en_cours'
                   check (statut in ('en_cours', 'terminee')),
  date_debut     date not null default current_date,
  date_fin       date,
  config         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists gestions_employeur_idx on public.gestions (employeur_id);
create index if not exists gestions_abonnement_idx on public.gestions (abonnement_id);

-- Règles imposées par la base : cohérence employeur/abonnement et quota.
-- Seules les gestions "en cours" comptent dans le quota : terminer une
-- gestion libère une place, sans toucher à l'abonnement.
create or replace function public.check_gestion_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abo     public.abonnements%rowtype;
  v_count   integer;
  v_ouvre   boolean := false;
begin
  select * into v_abo from public.abonnements where id = new.abonnement_id;
  if not found then
    raise exception 'Abonnement introuvable.';
  end if;

  if v_abo.employeur_id <> new.employeur_id then
    raise exception 'La gestion doit appartenir au même employeur que son abonnement.';
  end if;

  -- Vérifié seulement quand la gestion devient (ou est créée) "en cours".
  if new.statut = 'en_cours' then
    if tg_op = 'INSERT' then
      v_ouvre := true;
    elsif old.statut <> 'en_cours' then
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
      and statut = 'en_cours'
      and id <> new.id;

    if v_count >= v_abo.quota_gestions then
      raise exception 'Quota atteint : % gestion(s) en cours pour un quota de %.',
        v_count, v_abo.quota_gestions;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists gestions_check_quota on public.gestions;
create trigger gestions_check_quota
  before insert or update on public.gestions
  for each row execute function public.check_gestion_quota();

-- ---------------------------------------------------------------------------
-- 4. Documents (métadonnées seulement à ce stade)
-- ---------------------------------------------------------------------------
-- Le dépôt réel de fichiers PDF (Supabase Storage, glisser-déposer,
-- rattachement automatique par nom de fichier) est une brique ultérieure.
-- `storage_path` est prêt à recevoir le chemin du fichier à ce moment-là.
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  gestion_id    uuid not null references public.gestions(id) on delete cascade,
  employeur_id  uuid not null references public.profiles(id) on delete cascade,
  type_document text not null default 'bulletin'
                  check (type_document in ('bulletin', 'contrat', 'avenant', 'attestation', 'autre')),
  periode       text check (periode is null or periode ~ '^[0-9]{4}$'),  -- AAMM, ex. 2609
  titre         text not null,
  storage_path  text,
  created_at    timestamptz not null default now()
);

create index if not exists documents_gestion_idx on public.documents (gestion_id);
create index if not exists documents_employeur_idx on public.documents (employeur_id);

-- L'employeur d'un document est toujours celui de sa gestion : on le
-- recopie automatiquement, l'application n'a pas à (et ne peut pas) tricher.
create or replace function public.set_document_employeur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select employeur_id into new.employeur_id
  from public.gestions where id = new.gestion_id;
  if new.employeur_id is null then
    raise exception 'Gestion introuvable.';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_set_employeur on public.documents;
create trigger documents_set_employeur
  before insert or update of gestion_id on public.documents
  for each row execute function public.set_document_employeur();

-- ---------------------------------------------------------------------------
-- 5. Sécurité : qui peut lire / écrire quoi
-- ---------------------------------------------------------------------------
alter table public.abonnements enable row level security;
alter table public.gestions    enable row level security;
alter table public.documents   enable row level security;

revoke all on public.abonnements, public.gestions, public.documents from anon;
grant select, insert, update, delete
  on public.abonnements, public.gestions, public.documents to authenticated;

-- Un employeur LIT uniquement ses propres données et n'écrit rien (à ce
-- stade, toutes les écritures passent par l'administrateur).
-- Un administrateur lit et écrit tout.
drop policy if exists abonnements_select_own on public.abonnements;
create policy abonnements_select_own on public.abonnements
  for select to authenticated
  using (employeur_id = (select auth.uid()));

drop policy if exists abonnements_admin_all on public.abonnements;
create policy abonnements_admin_all on public.abonnements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists gestions_select_own on public.gestions;
create policy gestions_select_own on public.gestions
  for select to authenticated
  using (employeur_id = (select auth.uid()));

drop policy if exists gestions_admin_all on public.gestions;
create policy gestions_admin_all on public.gestions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists documents_select_own on public.documents;
create policy documents_select_own on public.documents
  for select to authenticated
  using (employeur_id = (select auth.uid()));

drop policy if exists documents_admin_all on public.documents;
create policy documents_admin_all on public.documents
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Devenir administrateur (à faire à la main, une seule fois)
-- ---------------------------------------------------------------------------
-- Le rôle ne peut PAS être modifié depuis le site (voir schema.sql : aucun
-- droit d'écriture sur la colonne `role`). Après avoir créé votre compte
-- sur le site, exécutez ici (en remplaçant l'email) :
--
--   update public.profiles set role = 'admin'
--   where email = 'frederic@aideetgarde.fr';
