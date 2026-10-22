-- ============================================================================
-- Brique 4 — Dépôt en masse des PDF et remplacement avec trace
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2h, et AVANT
-- de publier la version du site qui l'utilise (Commit + Push). Peut être
-- relancé sans danger.
--
-- 1. `documents.empreinte` : empreinte SHA-256 du fichier, calculée par le
--    navigateur au dépôt. Elle permet de reconnaître un fichier déjà déposé
--    à l'identique (ignoré par défaut au lieu d'être remplacé).
-- 2. `documents_remplacements` : trace d'un document remplacé (décision du
--    21/10 : l'ancien fichier est supprimé, une ligne de trace est gardée
--    côté administrateur : date, nom de l'ancien fichier, téléchargé ou non
--    par l'abonné).
-- ============================================================================

alter table public.documents add column if not exists empreinte text;
alter table public.documents drop constraint if exists documents_empreinte_format;
alter table public.documents
  add constraint documents_empreinte_format
  check (empreinte is null or empreinte ~ '^[0-9a-f]{64}$');

create table if not exists public.documents_remplacements (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references public.documents(id) on delete cascade,
  gestion_id          uuid references public.gestions(id) on delete cascade,
  employeur_id        uuid references public.profiles(id) on delete cascade,
  ancien_nom_fichier  text,
  ancienne_empreinte  text,
  ancien_depose_le    timestamptz,
  ancien_consulte_le  timestamptz,
  remplace_le         timestamptz not null default now(),
  remplace_par        uuid references public.profiles(id) on delete set null
);

create index if not exists documents_remplacements_document_idx
  on public.documents_remplacements (document_id, remplace_le desc);
create index if not exists documents_remplacements_employeur_idx
  on public.documents_remplacements (employeur_id);

alter table public.documents_remplacements enable row level security;
revoke all on public.documents_remplacements from anon, authenticated;
grant select, insert on public.documents_remplacements to authenticated;
grant all on public.documents_remplacements to service_role;

drop policy if exists documents_remplacements_admin on public.documents_remplacements;
create policy documents_remplacements_admin on public.documents_remplacements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
