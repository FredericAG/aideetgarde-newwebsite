-- Attestations fiscales : l'abonné lit son montant, seul l'administrateur écrit.
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
  ('50000000-0000-0000-0000-000000000001', 'abonne@test.invalid'),
  ('50000000-0000-0000-0000-000000000002', 'conseiller@test.invalid'),
  ('50000000-0000-0000-0000-000000000003', 'admin@test.invalid');
update public.profiles set role = 'conseiller' where id = '50000000-0000-0000-0000-000000000002';
update public.profiles set role = 'admin' where id = '50000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
insert into public.attestations_montants (employeur_id, annee, montant_importe) values ('50000000-0000-0000-0000-000000000001', 2026, 128.90);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
with u as (update public.attestations_montants set montant_importe = 1 returning 1)
select pg_temp.attendu((select count(*)::int from u), 0, 'conseiller : montant non modifiable');
select pg_temp.attendu((select count(*)::int from public.attestations_montants), 1, 'conseiller : lecture');

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
select pg_temp.attendu((select montant_importe from public.attestations_montants where annee = 2026), 128.90::numeric, 'abonné : son montant');
with u as (update public.attestations_montants set montant_importe = 1 returning 1)
select pg_temp.attendu((select count(*)::int from u), 0, 'abonné : pas de modification');
rollback;
