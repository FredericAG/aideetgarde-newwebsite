-- ============================================================================
-- Brique 5f — Suivi du traitement quotidien des paiements (12/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique5a. Peut être
-- relancé sans danger.
--
-- Chaque passage du traitement quotidien (prélèvement des échéances,
-- vérification des paiements en attente, résiliations) laisse une ligne :
-- date, origine (automatique chaque matin, ou lancé à la main depuis
-- l'administration), réussite et bilan. L'onglet Abonnements affiche le
-- dernier passage automatique et alerte s'il n'a pas eu lieu depuis plus
-- d'une journée : un matin sans prélèvement ne passe plus inaperçu.
-- ============================================================================

create table if not exists public.traitements_quotidiens (
  id        uuid primary key default gen_random_uuid(),
  lance_le  timestamptz not null default now(),
  origine   text not null check (origine in ('automatique', 'manuel')),
  ok        boolean not null,
  bilan     jsonb,
  erreur    text
);

create index if not exists traitements_quotidiens_date_idx
  on public.traitements_quotidiens (origine, lance_le desc);

alter table public.traitements_quotidiens enable row level security;
revoke all on public.traitements_quotidiens from anon, authenticated;
grant select on public.traitements_quotidiens to authenticated;
grant all on public.traitements_quotidiens to service_role;

-- Lecture réservée à l'administration ; l'écriture se fait par le serveur
-- du site (clé secrète), jamais depuis un navigateur.
drop policy if exists traitements_quotidiens_admin_select on public.traitements_quotidiens;
create policy traitements_quotidiens_admin_select on public.traitements_quotidiens
  for select to authenticated
  using (public.is_admin());
