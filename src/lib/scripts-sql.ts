/**
 * Scripts SQL attendus dans Supabase, dans l'ordre d'exécution (copie de
 * supabase/ORDRE.txt, vérifiée par les tests automatiques). Sert à
 * « Vérifier la configuration » : ceux qui ne figurent pas dans le registre
 * public.scripts_sql (brique13) sont signalés comme manquants.
 *
 * Ajouter un script : le créer dans supabase/, l'ajouter ici ET dans
 * ORDRE.txt, et terminer le script par son inscription au registre.
 */
export const SCRIPTS_SQL: string[] = [
  "schema",
  "brique2",
  "brique2b_documents_doublons",
  "brique2c_stockage_pdf",
  "brique2d_documents_ergonomie",
  "brique2e_types_documents",
  "brique2f_reference_gestion",
  "brique7a_declarations_mensuelles",
  "brique9a_notifications_push",
  "brique7b_modification_bulletin",
  "brique7c_documents_consultes",
  "brique9b_notifications_email",
  "brique3_gestions_abonne",
  "brique3b_quota_avenants",
  "brique7d_cloture_demandes",
  "brique3c_envoi_gestion",
  "brique2h_types_et_precision",
  "brique4_depot_en_masse",
  "brique5a_paiements",
  "brique5b_resiliation",
  "brique5d_obligations_legales",
  "brique5e_recommandations",
  "brique5f_suivi_traitement_quotidien",
  "brique9c_relances",
  "brique3d_cdd_remplacement",
  "brique3e_actions_courriers",
  "brique2g_liste_comptes_admin",
  "brique3f_formulaire_contrat",
  "brique3g_categories_profil",
  "brique3h_terminer_gestion_abonne",
  "brique3i_trajet_paternite_reouverture",
  "brique10_clics_partenaires",
  "droits_api_explicites",
  "brique11_role_conseiller",
  "brique3j_brouillon_sans_abonnement",
  "brique5g_changement_carte",
  "brique12_mesure_tunnel",
  "brique13_registre_et_erreurs",
  "brique14_parrainage",
  "brique15_attestations_fiscales",
];
