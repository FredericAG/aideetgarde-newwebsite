/**
 * Paramètres d'adresse des filtres par colonne de la liste des comptes
 * (administration). Module partagé entre le serveur (ListeComptes) et le
 * navigateur (FiltresColonnes).
 */
export const CLES_FILTRES = ["fref", "femp", "finsc", "fabo", "fges", "fsal", "fact"] as const;
export type CleFiltre = (typeof CLES_FILTRES)[number];
