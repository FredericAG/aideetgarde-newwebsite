-- ============================================================================
-- Brique 9c — Relances par email standardisées (administration)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2g.
-- Peut être relancé sans danger.
--
-- Chaque email de relance envoyé depuis l'administration (bouton
-- « Relancer » en fin de ligne ou sur la fiche du compte) est enregistré :
-- la liste affiche « relancé le … », ce qui évite d'envoyer deux fois le
-- même message par inadvertance, et garde une trace des échanges.
-- ============================================================================

create table if not exists public.relances (
  id           uuid primary key default gen_random_uuid(),
  employeur_id uuid not null references public.profiles(id) on delete cascade,
  modele       text not null,
  sujet        text not null,
  envoye_le    timestamptz not null default now(),
  envoye_par   uuid references public.profiles(id) on delete set null,
  envoye       boolean not null default true,
  detail       text
);

create index if not exists relances_employeur_idx on public.relances (employeur_id, envoye_le desc);

alter table public.relances enable row level security;
revoke all on public.relances from anon, authenticated;
grant select, insert on public.relances to authenticated;
grant all on public.relances to service_role;

-- Réservé à l'administration (lecture et écriture) ; l'abonné n'y a pas accès.
drop policy if exists relances_admin_all on public.relances;
create policy relances_admin_all on public.relances
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
