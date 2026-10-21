-- ============================================================================
-- Brique 2h — nouveaux types de documents et « précision » d'un document
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, AVANT de publier la
-- version du site qui l'utilise (Commit + Push). Peut être relancé sans
-- danger. Les documents existants ne changent pas.
--
-- 1. Type « Attestation employeur » (code AE), demandé le 21/10 pour la
--    reprise des documents de l'ancien site.
-- 2. Colonne `complement` (« précision » facultative, ex. « Démission »,
--    « n° 2 ») : la norme de nommage du 21/10 rend inutile le titre libre
--    (il répétait le nom de l'employeur et du salarié). L'abonné voit le
--    type, la précision éventuelle et la période.
-- ============================================================================
alter table public.documents drop constraint if exists documents_type_document_check;
alter table public.documents
  add constraint documents_type_document_check
  check (type_document in (
    'bulletin',                    -- BP     Bulletin de salaire (BPG reconnu)
    'contrat',                     -- CTRA   Contrat de travail
    'avenant',                     -- AV     Avenant
    'certificat_travail',          -- CT     Certificat de travail
    'solde_tout_compte',           -- STC    Solde de tout compte
    'attestation_france_travail',  -- FT     Attestation France Travail (APE reconnu)
    'attestation_salaire',         -- AS     Attestation de salaire
    'attestation_employeur',       -- AE     Attestation employeur (21/10)
    'attestation_honneur',         -- ATTHON Attestation sur l'honneur
    'licenciement',                -- LIC    Procédure de licenciement (informations et courriers)
    'rupture_conventionnelle',     -- RUPT   Rupture conventionnelle (informations, Cerfa)
    'courrier',                    -- LET    Courrier / lettre
    'attestation',                 --        Autre attestation
    'autre'                        --        Autre
  ));

alter table public.documents add column if not exists complement text;
alter table public.documents drop constraint if exists documents_complement_longueur;
alter table public.documents
  add constraint documents_complement_longueur
  check (complement is null or char_length(complement) between 1 and 60);
