-- ============================================================================
-- Brique 2b — interdire les documents en double
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2.sql.
-- Peut être relancé sans danger.
--
-- Règle : dans une même gestion, deux documents ne peuvent pas avoir à la
-- fois le même type, la même période ET le même titre. La comparaison du
-- titre ignore les majuscules et les espaces en début/fin ("Dudu " = "dudu").
-- Un bulletin rectificatif reste possible pour la même période, à condition
-- de lui donner un titre différent (ex. "Bulletin rectificatif").
--
-- Comme pour le quota, la règle est posée dans la base elle-même : elle
-- s'appliquera aussi au futur glisser-déposer en masse et à la reprise des
-- données de l'ancien site, pas seulement au formulaire actuel.
-- ============================================================================

-- 1. Garde-fou : s'il existe déjà des doublons, on s'arrête avec un message
--    clair plutôt que de supprimer des données à votre place.
do $$
declare
  v_liste text;
begin
  select string_agg(
           format('« %s » (%s, période %s) ×%s', titre, type_document,
                  coalesce(periode, 'aucune'), n),
           ' ; ')
  into v_liste
  from (
    select min(titre) as titre, type_document, periode, count(*) as n
    from public.documents
    group by gestion_id, type_document, coalesce(periode, ''), periode,
             lower(btrim(titre))
    having count(*) > 1
  ) d;

  if v_liste is not null then
    raise exception
      'Doublons déjà présents : %. Supprimez-les depuis la page Administration (bouton « Supprimer » du document), puis relancez ce script.',
      v_liste;
  end if;
end;
$$;

-- 2. La règle d'unicité.
create unique index if not exists documents_sans_doublon
  on public.documents (
    gestion_id,
    type_document,
    coalesce(periode, ''),
    lower(btrim(titre))
  );

-- 3. Au passage : la période AAMM doit avoir un mois valide (01 à 12).
--    "0013" ou "2600" sont désormais refusés. NOT VALID : la règle
--    s'applique aux nouveaux documents sans revérifier les anciens.
alter table public.documents drop constraint if exists documents_periode_mois_valide;
alter table public.documents
  add constraint documents_periode_mois_valide
  check (periode is null or periode ~ '^[0-9]{2}(0[1-9]|1[0-2])$') not valid;
