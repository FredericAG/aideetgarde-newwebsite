-- ============================================================================
-- Brique 5b — Résiliation de l'abonnement par l'abonné
--
-- À exécuter dans Supabase > SQL Editor, APRÈS brique5a (relancer aussi
-- brique5a après la mise à jour du 21/10 : la fonction des échéances tient
-- compte de la date de fin). Peut être relancé sans danger.
--
-- Règles (décision de Frédéric du 21/10) :
--  - l'abonné résilie lui-même depuis « Mon abonnement », avec confirmation ;
--  - la résiliation prend effet à la FIN DU MOIS CIVIL en cours : jusque-là
--    l'abonnement reste actif (gestions, documents, déclarations) ;
--  - le mois reste dû (décision de Frédéric du 21/10) : une échéance qui
--    tombe entre la demande et la fin du mois est prélevée normalement ;
--    aucune échéance n'est créée après la date de fin. Une échéance déjà
--    refusée reste due et continue d'être représentée jusqu'à la fin ;
--  - l'abonné peut annuler sa demande tant que la fin du mois n'est pas
--    passée : les prélèvements continuent normalement ;
--  - le lendemain de la fin du mois, la tâche quotidienne passe
--    l'abonnement en « résilié ». Les gestions ne sont PAS terminées
--    (décision 4) et les documents restent consultables.
-- ============================================================================

alter table public.abonnements
  add column if not exists resiliation_demandee_le     timestamptz,
  add column if not exists fin_prevue                  date,
  add column if not exists prochaine_echeance_suspendue date;

-- Reprise de la première version du script (21/10), qui suspendait les
-- prélèvements dès la demande : on les rétablit.
update public.abonnements
   set prochaine_echeance = prochaine_echeance_suspendue,
       prochaine_echeance_suspendue = null
 where fin_prevue is not null
   and prochaine_echeance is null
   and prochaine_echeance_suspendue is not null;

create index if not exists abonnements_fin_prevue_idx
  on public.abonnements (fin_prevue) where statut = 'actif' and fin_prevue is not null;

-- Demande de résiliation par l'abonné connecté. Renvoie la date de fin.
create or replace function public.demander_resiliation()
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abo public.abonnements%rowtype;
  v_fin date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
begin
  select * into v_abo from public.abonnements
   where employeur_id = (select auth.uid()) and statut = 'actif'
   for update;
  if not found then
    raise exception 'Aucun abonnement actif à résilier.';
  end if;
  if v_abo.fin_prevue is not null then
    raise exception 'La résiliation est déjà demandée : fin le %.', to_char(v_abo.fin_prevue, 'DD/MM/YYYY');
  end if;

  update public.abonnements
     set resiliation_demandee_le = now(),
         fin_prevue = v_fin
   where id = v_abo.id;
  return v_fin;
end;
$$;

-- Annulation de la demande, tant que la date de fin n'est pas passée.
create or replace function public.annuler_resiliation()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_abo public.abonnements%rowtype;
begin
  select * into v_abo from public.abonnements
   where employeur_id = (select auth.uid()) and statut = 'actif' and fin_prevue is not null
   for update;
  if not found then
    raise exception 'Aucune résiliation en cours.';
  end if;

  update public.abonnements
     set resiliation_demandee_le = null,
         fin_prevue = null,
         prochaine_echeance = coalesce(prochaine_echeance, prochaine_echeance_suspendue),
         prochaine_echeance_suspendue = null
   where id = v_abo.id;
end;
$$;

-- Application des résiliations arrivées à terme (tâche quotidienne).
create or replace function public.appliquer_resiliations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nb integer;
begin
  update public.abonnements
     set statut = 'resilie',
         date_fin = fin_prevue,
         motif_fin = 'Résiliation demandée par l''abonné le '
                     || to_char(resiliation_demandee_le at time zone 'Europe/Paris', 'DD/MM/YYYY')
   where statut = 'actif'
     and fin_prevue is not null
     and fin_prevue < current_date;
  get diagnostics v_nb = row_count;
  return v_nb;
end;
$$;

revoke all on function public.demander_resiliation() from public, anon;
revoke all on function public.annuler_resiliation() from public, anon;
revoke all on function public.appliquer_resiliations() from public, anon, authenticated;
grant execute on function public.demander_resiliation() to authenticated;
grant execute on function public.annuler_resiliation() to authenticated;
grant execute on function public.appliquer_resiliations() to service_role;
