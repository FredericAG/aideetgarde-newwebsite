-- Mesure du tunnel et registre des erreurs.
begin;
create or replace function pg_temp.attendu(obtenu anyelement, voulu anyelement, quoi text) returns void
language plpgsql as $$
begin
  if obtenu is distinct from voulu then
    raise exception 'ÉCHEC % : obtenu « % », attendu « % »', quoi, obtenu, voulu;
  end if;
end $$;
select public.compter_visite('/', 'moteur');
select public.compter_visite('/', 'moteur');
select public.compter_visite('/<script>', 'moteur');
select public.compter_visite('/', 'inconnue');
select pg_temp.attendu((select sum(nb)::int from public.visites_jour), 2, 'seules les visites valides comptent');
insert into auth.users (id, email, raw_user_meta_data)
values ('30000000-0000-0000-0000-000000000001', 'o@test.invalid', '{"origine":"proche","arrivee":"recommandation"}');
select pg_temp.attendu((select origine_declaree from public.profiles where id = '30000000-0000-0000-0000-000000000001'), 'proche', 'origine déclarée gardée');
select pg_temp.attendu(public.signaler_erreur('e1', '/', 'boom'), true, 'premier signalement : e-mail');
select pg_temp.attendu(public.signaler_erreur('e1', '/', 'boom'), false, 'même erreur dans l''heure : pas d''e-mail');
select pg_temp.attendu((select nb from public.erreurs_site where empreinte = 'e1'), 2, 'erreur comptée deux fois');
rollback;
