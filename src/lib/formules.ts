/**
 * Formules d'abonnement proposées à la souscription en ligne.
 *
 * GRILLE PROVISOIRE, reprise du support de présentation (voir
 * Analyse_croisee_et_feuille_de_route.md, décision 5 : 25,80 € au maximum
 * à partir de 4 salariés). Elle sera arrêtée à la brique 12 : il suffira de
 * modifier ce tableau. Le montant payé est TOUJOURS recalculé côté serveur
 * à partir de ce tableau, jamais repris du navigateur.
 */
export interface Formule {
  quota: number;
  tarif: number;
  libelle: string;
}

export const FORMULES: Formule[] = [
  { quota: 1, tarif: 12.9, libelle: "1 salarié" },
  { quota: 2, tarif: 19.2, libelle: "2 salariés" },
  { quota: 3, tarif: 25.8, libelle: "3 salariés" },
  { quota: 4, tarif: 25.8, libelle: "4 salariés" },
];

export function formuleParQuota(quota: number): Formule | undefined {
  return FORMULES.find((f) => f.quota === quota);
}

export const LIBELLES_STATUT_PAIEMENT: Record<string, string> = {
  a_jour: "À jour",
  en_retard: "Échéance refusée, nouvel essai prévu",
  impaye: "Impayé",
};
