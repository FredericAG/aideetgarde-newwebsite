-- Parrainage : code, mois offerts après 14 jours, échéance sautée, rétractation.
begin;
create or replace function pg_temp.attendu(obtenu anyelement, voulu anyelement, quoi text) returns void
language plpgsql as $$
begin
  if obtenu is distinct from voulu then
    raise exception 'ÉCHEC % : obtenu « % », attendu « % »', quoi, obtenu, voulu;
  end if;
end $$;

-- Parrain abonné.
insert into auth.users (id, email) values ('40000000-0000-0000-0000-000000000001', 'parrain@test.invalid');
select pg_temp.attendu(length((select code_parrainage from public.profiles where id = '40000000-0000-0000-0000-000000000001')), 8, 'code personnel à l''inscription');
insert into public.abonnements (employeur_id, quota_gestions, tarif_mensuel, date_debut, mode_paiement, systempay_token, jour_prelevement, prochaine_echeance)
values ('40000000-0000-0000-0000-000000000001', 1, 12.90, current_date - 100, 'systempay', 'alias-p', 5, current_date + 10);

-- Filleul inscrit avec le code (en minuscules : accepté).
insert into auth.users (id, email, raw_user_meta_data)
select '40000000-0000-0000-0000-000000000002', 'filleul@test.invalid',
       jsonb_build_object('parrain', lower(code_parrainage))
  from public.profiles where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.attendu((select parrain_id from public.profiles where id = '40000000-0000-0000-0000-000000000002'),
                       '40000000-0000-0000-0000-000000000001'::uuid, 'parrain retrouvé par son code');

-- Filleul abonné depuis 10 jours : rien encore (délai de rétractation).
insert into public.abonnements (employeur_id, quota_gestions, tarif_mensuel, date_debut, mode_paiement, systempay_token, jour_prelevement, prochaine_echeance)
values ('40000000-0000-0000-0000-000000000002', 1, 12.90, current_date - 10, 'systempay', 'alias-f', 1, current_date);
insert into public.commandes (order_id, employeur_id, type, quota, tarif_mensuel, montant, mode, statut)
values ('S-PARR-1', '40000000-0000-0000-0000-000000000002', 'souscription', 1, 12.90, 12.90, 'TEST', 'payee');
select pg_temp.attendu((select count(*)::int from public.accorder_parrainages()), 0, 'pas avant 14 jours');

-- 15 jours : un mois pour chacun, une seule fois.
update public.abonnements set date_debut = current_date - 15 where employeur_id = '40000000-0000-0000-0000-000000000002';
select pg_temp.attendu((select count(*)::int from public.accorder_parrainages()), 1, 'parrainage accordé');
select pg_temp.attendu((select count(*)::int from public.accorder_parrainages()), 0, 'accordé une seule fois');
select pg_temp.attendu((select mois_offerts::int from public.abonnements where employeur_id = '40000000-0000-0000-0000-000000000002'), 1, 'mois offert au filleul');
select pg_temp.attendu((select mois_offerts::int from public.abonnements where employeur_id = '40000000-0000-0000-0000-000000000001'), 1, 'mois offert au parrain');

-- Échéance du filleul aujourd'hui : pas de prélèvement, mois consommé.
select pg_temp.attendu((select count(*)::int from public.systempay_echeances_a_traiter(500) where employeur_id = '40000000-0000-0000-0000-000000000002'), 0, 'mois offert : rien à débiter');
select pg_temp.attendu((select mois_offerts::int from public.abonnements where employeur_id = '40000000-0000-0000-0000-000000000002'), 0, 'mois offert consommé');
select pg_temp.attendu((select count(*)::int from public.mois_offerts_utilises where employeur_id = '40000000-0000-0000-0000-000000000002'), 1, 'mois offert tracé');
select pg_temp.attendu((select prochaine_echeance > current_date from public.abonnements where employeur_id = '40000000-0000-0000-0000-000000000002'), true, 'échéance suivante avancée');

-- Filleul rétracté : aucun mois.
insert into auth.users (id, email, raw_user_meta_data)
select '40000000-0000-0000-0000-000000000003', 'retracte@test.invalid', jsonb_build_object('parrain', code_parrainage)
  from public.profiles where id = '40000000-0000-0000-0000-000000000001';
insert into public.abonnements (employeur_id, quota_gestions, tarif_mensuel, date_debut, mode_paiement)
values ('40000000-0000-0000-0000-000000000003', 1, 12.90, current_date - 20, 'systempay');
insert into public.commandes (order_id, employeur_id, type, quota, tarif_mensuel, montant, mode, statut)
values ('S-PARR-2', '40000000-0000-0000-0000-000000000003', 'souscription', 1, 12.90, 12.90, 'TEST', 'payee');
insert into public.retractations (abonnement_id, employeur_id, nom, prenom, email)
select id, employeur_id, 'R', 'R', 'retracte@test.invalid' from public.abonnements where employeur_id = '40000000-0000-0000-0000-000000000003';
select pg_temp.attendu((select count(*)::int from public.accorder_parrainages()), 0, 'rétractation : pas de mois offert');
rollback;
