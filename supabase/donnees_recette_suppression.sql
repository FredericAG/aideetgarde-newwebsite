-- ============================================================================
-- SUPPRESSION DES DONNÉES DE RECETTE FICTIVES
--
-- À exécuter dans Supabase > SQL Editor avant la reprise réelle des
-- clients (ou pour recharger des données de recette neuves).
--
-- Supprime tous les comptes en @recette.invalid. Par effet de cascade,
-- leurs profils, abonnements, gestions, documents, déclarations, demandes
-- d'avenant et appareils de notification sont supprimés avec eux. Aucun
-- autre compte n'est touché.
-- ============================================================================

begin;

delete from auth.users where email like '%@recette.invalid';

-- Contrôle : doit afficher 0.
select count(*) as comptes_de_recette_restants
  from public.profiles where email like '%@recette.invalid';

commit;
