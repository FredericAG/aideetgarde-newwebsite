-- ============================================================================
-- Brique 2d — types de documents et noms de fichiers lisibles
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2c.
-- Peut être relancé sans danger.
-- ============================================================================

-- 1. Nouveau type de document : solde de tout compte.
alter table public.documents drop constraint if exists documents_type_document_check;
alter table public.documents
  add constraint documents_type_document_check
  check (type_document in (
    'bulletin', 'contrat', 'avenant', 'solde_tout_compte', 'attestation', 'autre'
  ));

-- 2. Noms lisibles dans le stockage.
--    Les dossiers deviennent par exemple :
--      zydownik-frederic_78dc878b-2f76-.../dudu1-toto1_bcae3008-.../2205_bulletin_...pdf
--    Le premier dossier se TERMINE toujours par l'identifiant de l'employeur
--    (36 caractères) : c'est cette fin, et elle seule, qui sert de clé de
--    sécurité. Le nom lisible devant n'est qu'une aide pour s'y retrouver
--    dans la console Supabase. Les fichiers déjà déposés (dossiers nommés
--    uniquement par l'identifiant) restent lisibles par leur propriétaire.
drop policy if exists documents_fichiers_lecture_employeur on storage.objects;
create policy documents_fichiers_lecture_employeur on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and right((storage.foldername(name))[1], 36) = (select auth.uid())::text
  );
