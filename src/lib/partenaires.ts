/**
 * Partenaires vers lesquels Aide & Garde oriente ses abonnés et leurs
 * salariés (avantages du salarié). Tous les liens passent par
 * /avantages/<clé>?depuis=<endroit> : le clic est compté (table
 * clics_partenaires, script brique10), puis la personne est redirigée vers
 * le site du partenaire. Bilan dans Administration > Partenaires.
 */
export type ClePartenaire = "asc" | "ircem" | "spstn" | "spstn_salarie" | "fiche";

export const PARTENAIRES: Record<ClePartenaire, { nom: string; url: string }> = {
  asc: { nom: "ASC loisirs emploi à domicile", url: "https://www.asc-loisirs-emploidomicile.fr/accueil" },
  ircem: { nom: "Ircem", url: "https://www.ircem.com/" },
  spstn: { nom: "SPSTN (santé au travail), page employeurs", url: "https://spstn.org/je-suis-particulier-employeur" },
  spstn_salarie: { nom: "SPSTN (santé au travail), page salariés", url: "https://spstn.org/je-suis-salarie" },
  // Interne : téléchargements de la fiche « Vos droits et avantages ».
  fiche: { nom: "Fiche « Vos droits et avantages » (PDF)", url: "/fiche-avantages-salarie.pdf" },
};

/** Endroits du site d'où partent les liens (pour savoir ce qui marche). */
export const PROVENANCES: Record<string, string> = {
  aide: "Centre d'aide",
  fiche: "Fiche remise au salarié (PDF)",
  gestion: "Page d'une gestion",
  "creation-gestion": "Création d'une gestion",
  email: "Email de validation d'une gestion",
  autre: "Autre",
};

/** Lien suivi vers un partenaire. */
export function lienPartenaire(cle: ClePartenaire, depuis: keyof typeof PROVENANCES): string {
  return `/avantages/${cle}?depuis=${depuis}`;
}
