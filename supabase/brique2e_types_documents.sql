-- ============================================================================
-- Brique 2e — liste complète des types de documents
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2d.
-- Peut être relancé sans danger. Les documents existants ne changent pas.
-- ============================================================================
alter table public.documents drop constraint if exists documents_type_document_check;
alter table public.documents
  add constraint documents_type_document_check
  check (type_document in (
    'bulletin',                    -- BPG    Bulletin de salaire
    'contrat',                     --        Contrat de travail
    'avenant',                     --        Avenant
    'certificat_travail',          -- CT     Certificat de travail
    'solde_tout_compte',           -- STC    Solde de tout compte
    'attestation_france_travail',  -- FT     Attestation France Travail
    'attestation_salaire',         -- AS     Attestation de salaire
    'attestation_honneur',         -- ATTHON Attestation sur l'honneur
    'licenciement',                --        Courrier de licenciement
    'rupture_conventionnelle',     --        Procédure de rupture conventionnelle
    'courrier',                    --        Courrier / lettre (démission, engagement d'un mineur, attestation d'emploi...)
    'attestation',                 --        Autre attestation
    'autre'                        --        Autre
  ));
