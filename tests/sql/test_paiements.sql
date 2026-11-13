-- Paiements : souscription, double notification, échéances, refus, résiliation, carte.
-- Chaque test lève une erreur si le résultat n'est pas celui attendu.
begin;
create or replace function pg_temp.attendu(obtenu anyelement, voulu anyelement, quoi text) returns void
language plpgsql as $$
begin
  if obtenu is distinct from voulu then
    raise exception 'ÉCHEC % : obtenu « % », attendu « % »', quoi, obtenu, voulu;
  end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data)
values ('10000000-0000-0000-0000-000000000001', 'paiement@test.invalid', '{"prenom":"Test","nom":"Paiement"}');

-- Souscription payée : abonnement créé, une seule fois.
insert into public.commandes (order_id, employeur_id, type, quota, tarif_mensuel, montant, mode)
values ('S-TEST-1', '10000000-0000-0000-0000-000000000001', 'souscription', 1, 12.90, 12.90, 'TEST');
select pg_temp.attendu(
  public.systempay_resultat_commande('S-TEST-1', 'tx-1', 'PAID', 'ACCEPTED', null, 12.90, 'alias-1', '497010XXXXXX0228', '2030-12-31', 'TEST', 'ipn'),
  'abonnement_cree', 'souscription payée');
select pg_temp.attendu(
  public.systempay_resultat_commande('S-TEST-1', 'tx-1', 'PAID', 'ACCEPTED', null, 12.90, 'alias-1', '497010XXXXXX0228', '2030-12-31', 'TEST', 'retour'),
  'deja_traitee', 'notification reçue deux fois');
select pg_temp.attendu((select count(*)::int from public.abonnements where employeur_id = '10000000-0000-0000-0000-000000000001'), 1, 'un seul abonnement');
select pg_temp.attendu((select count(*)::int from public.paiements where order_id = 'S-TEST-1'), 1, 'un seul paiement enregistré');

-- Date d'échéance : jour anniversaire, mois suivant si déjà passé.
select pg_temp.attendu(public.date_echeance_suivante('2026-11-13', 13), '2026-12-13'::date, 'échéance au jour anniversaire');
select pg_temp.attendu(public.date_echeance_suivante('2026-11-10', 13), '2026-11-13'::date, 'échéance dans le mois');
select pg_temp.attendu(public.date_echeance_suivante('2026-12-28', 28), '2027-01-28'::date, 'passage d''année');

-- Échéance arrivée : créée une fois, réservée, puis refusée, retentée, payée.
update public.abonnements set prochaine_echeance = current_date where employeur_id = '10000000-0000-0000-0000-000000000001';
select pg_temp.attendu((select count(*)::int from public.systempay_echeances_a_traiter(500)), 1, 'une échéance à débiter');
select pg_temp.attendu((select count(*)::int from public.systempay_echeances_a_traiter(500)), 0, 'échéance réservée, pas reprise tout de suite');
select pg_temp.attendu(
  (select left(public.systempay_resultat_echeance(id, 'tx-2', 'UNPAID', 'REFUSED', '05', 12.90, null, 'TEST', 'echeance'), 16)
     from public.echeances where employeur_id = '10000000-0000-0000-0000-000000000001'),
  'refusee_retentee', 'premier refus : nouvel essai');
select pg_temp.attendu((select statut_paiement from public.abonnements where employeur_id = '10000000-0000-0000-0000-000000000001'), 'en_retard', 'abonnement en retard');
select pg_temp.attendu(
  (select public.systempay_resultat_echeance(id, 'tx-3', 'PAID', 'ACCEPTED', null, 12.90, null, 'TEST', 'echeance')
     from public.echeances where employeur_id = '10000000-0000-0000-0000-000000000001'),
  'payee', 'échéance payée au deuxième essai');
select pg_temp.attendu((select statut_paiement from public.abonnements where employeur_id = '10000000-0000-0000-0000-000000000001'), 'a_jour', 'abonnement à jour');

-- Nouvelle carte (brique 5g) : l'alias est remplacé.
insert into public.commandes (order_id, employeur_id, type, montant, mode)
values ('C-TEST-1', '10000000-0000-0000-0000-000000000001', 'carte', 0, 'TEST');
select pg_temp.attendu(public.systempay_resultat_carte('C-TEST-1', 'tx-4', 'PAID', 'alias-2', '497010XXXXXX0071', '2031-06-30'), 'carte_enregistree', 'nouvelle carte');
select pg_temp.attendu((select systempay_token from public.abonnements where employeur_id = '10000000-0000-0000-0000-000000000001'), 'alias-2', 'alias remplacé');
select pg_temp.attendu(public.systempay_resultat_carte('C-TEST-1', 'tx-4', 'PAID', 'alias-3', null, null), 'deja_traitee', 'carte traitée une fois');

-- Résiliation : appliquée à sa date, plus aucune échéance ensuite.
update public.abonnements set fin_prevue = current_date - 1, prochaine_echeance = current_date
 where employeur_id = '10000000-0000-0000-0000-000000000001';
select public.appliquer_resiliations();
select pg_temp.attendu((select statut from public.abonnements where employeur_id = '10000000-0000-0000-0000-000000000001'), 'resilie', 'résiliation appliquée');
select pg_temp.attendu((select count(*)::int from public.systempay_echeances_a_traiter(500)), 0, 'aucun débit après résiliation');

rollback;
