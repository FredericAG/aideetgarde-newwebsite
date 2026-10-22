-- ============================================================================
-- Brique 5d — Obligations légales de la vente en ligne
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique5a et 5b, et
-- AVANT de publier la version du site qui l'utilise. Peut être relancé sans
-- danger.
--
-- 1. Preuve de l'acceptation des CGV à la souscription : version, date, et
--    demande d'exécution immédiate (le service commence pendant le délai de
--    rétractation de 14 jours), demande de déclaration Urssaf par Aide & Garde.
-- 2. Rétractation en ligne (« Renoncer au contrat ici ») : obligatoire pour
--    les contrats conclus en ligne depuis le 19 juin 2026 (Code de la
--    consommation, art. L221-21 modifié par l'ordonnance du 5 janvier 2026).
--    La rétractation met fin à l'abonnement le jour même ; le remboursement
--    (montant payé moins le service déjà fourni) est fait par Aide & Garde
--    depuis le Back Office Systempay, dans les 14 jours.
-- ============================================================================

alter table public.commandes add column if not exists cgv_version text;
alter table public.commandes add column if not exists cgv_acceptees_le timestamptz;
alter table public.commandes add column if not exists execution_immediate boolean;
-- Demande expresse de déclaration des salaires par Aide & Garde (Cesu /
-- Pajemploi), cochée à la souscription.
alter table public.commandes add column if not exists mandat_declaration boolean;

create table if not exists public.retractations (
  id             uuid primary key default gen_random_uuid(),
  abonnement_id  uuid not null references public.abonnements(id) on delete cascade,
  employeur_id   uuid not null references public.profiles(id) on delete cascade,
  nom            text not null check (char_length(nom) between 1 and 100),
  prenom         text not null check (char_length(prenom) between 1 and 100),
  email          text not null check (char_length(email) between 3 and 254),
  reference      text,
  envoyee_le     timestamptz not null default now(),
  rembourse_le   timestamptz,
  note_admin     text
);

create index if not exists retractations_employeur_idx on public.retractations (employeur_id, envoyee_le desc);

alter table public.retractations enable row level security;
revoke all on public.retractations from anon, authenticated;
grant select on public.retractations to authenticated;
grant update (rembourse_le, note_admin) on public.retractations to authenticated;
grant all on public.retractations to service_role;

drop policy if exists retractations_lecture on public.retractations;
create policy retractations_lecture on public.retractations
  for select to authenticated
  using (employeur_id = (select auth.uid()) or public.is_admin());

drop policy if exists retractations_admin_maj on public.retractations;
create policy retractations_admin_maj on public.retractations
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Rétractation par l'abonné connecté, dans les 14 jours qui suivent la
-- souscription en ligne. Renvoie la date et l'heure d'enregistrement.
create or replace function public.exercer_retractation(p_nom text, p_prenom text, p_email text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abo public.abonnements%rowtype;
  v_ref text;
  v_quand timestamptz := now();
begin
  select * into v_abo from public.abonnements
   where employeur_id = (select auth.uid()) and statut = 'actif'
   for update;
  if not found then
    raise exception 'Aucun abonnement actif.';
  end if;
  if v_abo.mode_paiement is distinct from 'systempay' then
    raise exception 'Cet abonnement n''a pas été souscrit en ligne : contactez Aide & Garde.';
  end if;
  if current_date > v_abo.date_debut + 14 then
    raise exception 'Le délai de rétractation de 14 jours est dépassé : vous pouvez résilier votre abonnement.';
  end if;
  if coalesce(btrim(p_nom), '') = '' or coalesce(btrim(p_prenom), '') = '' or coalesce(btrim(p_email), '') = '' then
    raise exception 'Nom, prénom et email sont nécessaires.';
  end if;

  select c.order_id into v_ref from public.commandes c
   where c.abonnement_id = v_abo.id and c.type = 'souscription'
   order by c.created_at desc limit 1;

  insert into public.retractations (abonnement_id, employeur_id, nom, prenom, email, reference, envoyee_le)
  values (v_abo.id, v_abo.employeur_id, btrim(p_nom), btrim(p_prenom), btrim(p_email), v_ref, v_quand);

  -- Fin immédiate : plus aucune échéance.
  update public.echeances set statut = 'annulee'
   where abonnement_id = v_abo.id and statut = 'a_payer';
  update public.abonnements
     set statut = 'resilie',
         date_fin = current_date,
         motif_fin = 'Rétractation de l''abonné le ' || to_char(v_quand at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24:MI'),
         prochaine_echeance = null,
         fin_prevue = null
   where id = v_abo.id;
  return v_quand;
end;
$$;

revoke all on function public.exercer_retractation(text, text, text) from public, anon;
grant execute on function public.exercer_retractation(text, text, text) to authenticated;
