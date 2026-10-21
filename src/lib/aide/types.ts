/**
 * Centre d'aide (spécifications § 6 bis) : contenu rédigé sous forme de
 * données, modifiable sans toucher aux pages. Chaque question tient sur une
 * réponse courte (`resume`) suivie du détail (`corps`).
 */

export type Bloc =
  | { p: string }
  | { liste: string[] }
  | { etapes: { titre: string; texte: string }[] }
  | { tableau: { entetes: string[]; lignes: string[][]; legende?: string } }
  | { exemple: string }
  | { note: string };

export interface Question {
  /** Identifiant dans l'adresse (#ancre), en minuscules sans accents. */
  slug: string;
  question: string;
  /** Réponse en une ou deux phrases. */
  resume: string;
  corps?: Bloc[];
  /** Mots servant à la recherche (synonymes, sigles). */
  motsCles?: string[];
  /** Lien vers une autre page du site (aide contextuelle inverse). */
  lien?: { href: string; libelle: string };
}

export type PorteEntree = "documents" | "employer" | "espace";

export interface Theme {
  slug: string;
  titre: string;
  porte: PorteEntree;
  intro: string;
  questions: Question[];
}

export const PORTES: { cle: PorteEntree; titre: string; texte: string }[] = [
  {
    cle: "documents",
    titre: "Comprendre mes documents",
    texte: "Votre bulletin de paie ligne par ligne, et les documents remis en fin de contrat.",
  },
  {
    cle: "employer",
    titre: "Employer un salarié à domicile",
    texte: "Contrat, aides, congés, arrêts de travail, fin du contrat : les règles expliquées simplement.",
  },
  {
    cle: "espace",
    titre: "Utiliser mon espace",
    texte: "Déclarer le mois, télécharger vos documents, ajouter un salarié, gérer votre abonnement.",
  },
];

/** Date de la dernière relecture du contenu, affichée sur chaque page. */
export const MIS_A_JOUR = "21/10/2026";

/**
 * Contenu en relecture par Aide & Garde : bandeau d'avertissement sur les
 * pages et pas d'indexation par les moteurs de recherche tant que vrai.
 * Passer à false après validation de la liste de contrôle
 * (docs/centre-aide-relecture.md).
 */
export const EN_RELECTURE = true;
