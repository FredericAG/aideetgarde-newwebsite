-- Droits : abonné, conseiller, administrateur ; brouillon sans abonnement.
begin;
create or replace function pg_temp.attendu(obtenu anyelement, voulu anyelement, quoi text) returns void
language plpgsql as $$
begin
  if obtenu is distinct from voulu then
    raise exception 'ÉCHEC % : obtenu « % », attendu « % »', quoi, obtenu, voulu;
  end if;
end $$;
grant execute on function pg_temp.attendu(anyelement, anyelement, text) to authenticated;

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-000000000001', 'abonne@test.invalid'),
  ('20000000-0000-0000-0000-000000000002', 'autre@test.invalid'),
  ('20000000-0000-0000-0000-000000000003', 'conseiller@test.invalid'),
  ('20000000-0000-0000-0000-000000000004', 'admin@test.invalid');
update public.profiles set role = 'conseiller' where id = '20000000-0000-0000-0000-000000000003';
update public.profiles set role = 'admin' where id = '20000000-0000-0000-0000-000000000004';
insert into public.abonnements (employeur_id, quota_gestions, tarif_mensuel, date_debut)
values ('20000000-0000-0000-0000-000000000002', 1, 12.90, current_date);

-- L'abonné sans abonnement prépare un brouillon ; l'envoi demande la formule.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select pg_temp.attendu(
  public.gestion_enregistrer_brouillon(null, 'garde_enfants', 'Lina', 'Test', current_date, 'CDI', null, 20, 'semaine', 12, '') is not null,
  true, 'brouillon sans abonnement');
do $$
begin
  perform public.gestion_envoyer((select id from public.gestions limit 1));
  raise exception 'ÉCHEC envoi sans abonnement accepté';
exception when others then
  if sqlerrm not like '%choisissez d''abord votre formule%' then raise; end if;
end $$;
-- Il ne voit ni les comptes ni les abonnements des autres.
select pg_temp.attendu((select count(*)::int from public.profiles), 1, 'abonné : son seul profil');
select pg_temp.attendu((select count(*)::int from public.abonnements), 0, 'abonné : pas l''abonnement d''un autre');

-- Le conseiller voit tout, ne modifie pas un abonnement, ne supprime rien.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select pg_temp.attendu(public.is_admin(), true, 'conseiller dans l''équipe');
select pg_temp.attendu(public.est_administrateur(), false, 'conseiller pas administrateur');
select pg_temp.attendu((select count(*)::int from public.abonnements), 1, 'conseiller : voit les abonnements');
with u as (update public.abonnements set tarif_mensuel = 1 returning 1)
select pg_temp.attendu((select count(*)::int from u), 0, 'conseiller : tarif non modifiable');
with d as (delete from public.gestions returning 1)
select pg_temp.attendu((select count(*)::int from d), 0, 'conseiller : pas de suppression');
with u as (update public.gestions set precisions = 'vu' returning 1)
select pg_temp.attendu((select count(*)::int from u), 1, 'conseiller : peut mettre à jour une gestion');
select pg_temp.attendu((select count(*)::int from public.admin_comptes where id = '20000000-0000-0000-0000-000000000003'), 0, 'l''équipe n''apparaît pas dans les comptes');

-- L'administrateur peut tout.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
with u as (update public.abonnements set tarif_mensuel = 19.20 returning 1)
select pg_temp.attendu((select count(*)::int from u), 1, 'administrateur : tarif modifiable');
with d as (delete from public.gestions returning 1)
select pg_temp.attendu((select count(*)::int from d), 1, 'administrateur : suppression');
rollback;
