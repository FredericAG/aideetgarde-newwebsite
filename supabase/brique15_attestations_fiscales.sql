-- ============================================================================
-- Brique 15 — Attestations fiscales annuelles (13/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique14. Peut être
-- relancé sans danger.
--
-- L'abonné télécharge, à partir du 1er janvier, l'attestation des sommes
-- versées à Aide & Garde l'année précédente (crédit d'impôt, CGI art. 199
-- sexdecies ; à remettre avant le 31 mars). Montant = paiements reçus par
-- le site dans l'année (production) + montants importés par
-- l'administrateur pour les paiements faits ailleurs (ancien site) +
-- ajustement éventuel (remboursement, geste commercial).
-- ============================================================================

create table if not exists public.attestations_montants (
  employeur_id  uuid not null references public.profiles(id) on delete cascade,
  annee         smallint not null check (annee between 2020 and 2100),
  -- Payé hors du nouveau site (ancien site), importé par fichier.
  montant_importe numeric(10, 2) not null default 0 check (montant_importe >= 0),
  -- Correction manuelle (négative pour un remboursement).
  ajustement    numeric(10, 2) not null default 0,
  note          text,
  maj_le        timestamptz not null default now(),
  primary key (employeur_id, annee)
);

alter table public.attestations_montants enable row level security;
revoke all on public.attestations_montants from anon, authenticated;
grant select, insert, update, delete on public.attestations_montants to authenticated;
grant all on public.attestations_montants to service_role;

drop policy if exists attestations_montants_lecture on public.attestations_montants;
create policy attestations_montants_lecture on public.attestations_montants
  for select to authenticated
  using (employeur_id = (select auth.uid()) or public.is_admin());

-- Montants : administrateur seul (pas les conseillers).
drop policy if exists attestations_montants_admin on public.attestations_montants;
create policy attestations_montants_admin on public.attestations_montants
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

insert into public.scripts_sql (nom) values ('brique15_attestations_fiscales') on conflict (nom) do nothing;
