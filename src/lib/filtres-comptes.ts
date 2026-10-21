/**
 * Filtres par colonne des listes de l'administration (Comptes, Abonnements).
 * Module partagé entre le serveur (pages) et le navigateur (FiltresColonnes) :
 * il ne contient que des données.
 */

/** Description d'un champ de filtre, dans l'ordre des colonnes du tableau. */
export type FiltreColonne =
  | { cle: string; type: "texte"; placeholder: string; label: string }
  | { cle: string; type: "liste"; label: string; options: [string, string][] };

export const CLES_FILTRES = ["fref", "femp", "finsc", "fabo", "fges", "fsal", "fact"] as const;
export type CleFiltre = (typeof CLES_FILTRES)[number];

export const CLES_FILTRES_ABONNEMENTS = ["fref", "femp", "fdeb", "ftar", "fpla", "fver", "fpai"] as const;
export type CleFiltreAbonnement = (typeof CLES_FILTRES_ABONNEMENTS)[number];

/** Les 15 dernières années, de la plus récente à la plus ancienne. */
export function anneesRecentes(): [string, string][] {
  const annee = new Date().getFullYear();
  return Array.from({ length: 15 }, (_, i) => {
    const a = String(annee - i);
    return [a, a];
  });
}

export function filtresComptes(): FiltreColonne[] {
  return [
    { cle: "fref", type: "texte", placeholder: "C00…", label: "Filtrer par référence" },
    { cle: "femp", type: "texte", placeholder: "Nom, email, ville…", label: "Filtrer par employeur" },
    { cle: "finsc", type: "liste", label: "Filtrer par année d'inscription", options: anneesRecentes() },
    {
      cle: "fabo",
      type: "liste",
      label: "Filtrer par abonnement",
      options: [
        ["actif", "Actif"],
        ["resilie", "Résilié"],
        ["aucun", "Aucun"],
      ],
    },
    {
      cle: "fges",
      type: "liste",
      label: "Filtrer par gestions",
      options: [
        ["en_cours", "Avec gestion en cours"],
        ["a_valider", "Avec gestion à valider"],
        ["brouillon", "Avec brouillon"],
        ["aucune", "Sans gestion active"],
      ],
    },
    { cle: "fsal", type: "texte", placeholder: "Nom du salarié…", label: "Filtrer par salarié" },
    {
      cle: "fact",
      type: "liste",
      label: "Filtrer par actions",
      options: [
        ["avec", "Avec actions"],
        ["sans", "Sans action"],
      ],
    },
  ];
}

export function filtresAbonnements(): FiltreColonne[] {
  return [
    { cle: "fref", type: "texte", placeholder: "C00…", label: "Filtrer par référence" },
    { cle: "femp", type: "texte", placeholder: "Nom, email, ville…", label: "Filtrer par abonné" },
    { cle: "fdeb", type: "liste", label: "Filtrer par année de début", options: anneesRecentes() },
    { cle: "ftar", type: "texte", placeholder: "12,90", label: "Filtrer par tarif mensuel" },
    {
      cle: "fpla",
      type: "liste",
      label: "Filtrer par places",
      options: [
        ["libres", "Places libres"],
        ["complet", "Complet"],
        ["aucune", "Aucune utilisée"],
      ],
    },
    {
      cle: "fver",
      type: "liste",
      label: "Filtrer par point à vérifier",
      options: [
        ["resiliation", "Résiliation demandée"],
        ["depassement", "Quota dépassé"],
        ["sans_gestion", "Payé sans gestion"],
        ["rien", "Rien à vérifier"],
      ],
    },
    {
      cle: "fpai",
      type: "liste",
      label: "Filtrer par paiement",
      options: [
        ["hors_site", "Hors site"],
        ["a_jour", "À jour (site)"],
        ["en_retard", "Refusé, nouvel essai"],
        ["impaye", "Impayé"],
      ],
    },
  ];
}
