-- ============================================================================
-- Brique 2c — stockage des PDF (Supabase Storage)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2b.
-- Contient aussi la règle « un seul bulletin de salaire par mois » (§ 4).
-- Peut être relancé sans danger.
--
-- Les fichiers sont rangés dans un espace de stockage PRIVÉ nommé
-- "documents" : aucun fichier n'a d'adresse publique. Chemin de chaque
-- fichier : <id employeur>/<id gestion>/<id document>.pdf
-- Le premier dossier (l'employeur) sert de clé de sécurité : un client ne
-- peut lire QUE les fichiers rangés sous son propre identifiant.
-- ============================================================================

-- 1. L'espace de stockage : privé, PDF uniquement, 20 Mo maximum par fichier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Qui peut faire quoi sur les fichiers.
-- Administrateur : tout (déposer, lire, remplacer, supprimer).
drop policy if exists documents_fichiers_admin on storage.objects;
create policy documents_fichiers_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());

-- Employeur : lecture seule, et uniquement dans son propre dossier.
drop policy if exists documents_fichiers_lecture_employeur on storage.objects;
create policy documents_fichiers_lecture_employeur on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 3. Nom d'origine du fichier déposé (affichage, et base du futur
--    rattachement automatique par nom de fichier de la brique 4).
alter table public.documents
  add column if not exists nom_fichier_origine text;

-- 4. Règle métier (décision de Frédéric, 16/10/2026) : UN SEUL bulletin de
--    salaire par mois et par gestion, sans exception. Un bulletin corrigé
--    remplace l'ancien (supprimer l'ancien, puis déposer le nouveau).
--    Un bulletin doit donc obligatoirement avoir une période.
do $$
declare
  v_liste text;
begin
  select string_agg(format('période %s ×%s', periode, n), ' ; ')
  into v_liste
  from (
    select periode, count(*) as n
    from public.documents
    where type_document = 'bulletin' and periode is not null
    group by gestion_id, periode
    having count(*) > 1
  ) d;

  if v_liste is not null then
    raise exception
      'Plusieurs bulletins pour un même mois dans une même gestion : %. Supprimez les bulletins en trop depuis la page Administration, puis relancez ce script.',
      v_liste;
  end if;
end;
$$;

create unique index if not exists documents_un_bulletin_par_mois
  on public.documents (gestion_id, periode)
  where type_document = 'bulletin';

alter table public.documents drop constraint if exists documents_bulletin_avec_periode;
alter table public.documents
  add constraint documents_bulletin_avec_periode
  check (type_document <> 'bulletin' or periode is not null) not valid;
