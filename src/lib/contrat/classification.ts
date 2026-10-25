/**
 * Classification des emplois de la convention collective des particuliers
 * employeurs et de l'emploi à domicile (IDCC 3239), version en vigueur au
 * 1er janvier 2026 (article 2.2 de l'annexe 7 et fiches des annexes A à E,
 * Légifrance KALIARTI000051853268). Les intitulés des emplois-repères et
 * leurs échelles reprennent le texte ; les activités sont résumées en mots
 * simples pour l'employeur (liste indicative, non exhaustive, comme dans la
 * convention).
 *
 * Chaque catégorie proposée au début d'une nouvelle gestion regroupe les
 * emplois-repères d'un domaine de la convention.
 */
import type { TypeGestion } from "@/lib/data";

export type Domaine = "enfant" | "adulte" | "espaces_de_vie" | "environnement_technique" | "environnement_externe";

export interface EmploiRepere {
  cle: string;
  libelle: string;
  domaine: Domaine;
  /** Échelle de la grille (I à XII), notée ici en chiffres. */
  echelle: number;
  /** Ce qui distingue cet emploi, en une phrase. */
  resume: string;
  /** Code ROME (Pôle emploi / France Travail), quand il est sûr. */
  rome?: string;
}

export const EMPLOIS_REPERES_CCN: EmploiRepere[] = [
  // Annexe A — Domaine Enfant
  { cle: "baby_sitter", libelle: "Baby-sitter", domaine: "enfant", echelle: 1, rome: "K1303", resume: "Garde occasionnelle et de courte durée d'enfants de plus de 3 ans." },
  { cle: "garde_a", libelle: "Garde d'enfant(s) / Assistant parental A", domaine: "enfant", echelle: 3, rome: "K1303", resume: "Garde régulière d'enfants de tout âge : repas, soins, éveil, sorties, aide aux devoirs jusqu'à la maternelle." },
  { cle: "garde_b", libelle: "Garde d'enfant(s) / Assistant parental B", domaine: "enfant", echelle: 4, rome: "K1303", resume: "Comme A, avec le suivi des devoirs à partir de l'école élémentaire, le linge et les repas des enfants." },
  { cle: "garde_handicap_a", libelle: "Garde d'enfant(s) en situation de handicap A", domaine: "enfant", echelle: 4, rome: "K1303", resume: "Enfant avec un handicap léger ou non reconnu : accompagnement dans les gestes du quotidien et activités adaptées." },
  { cle: "garde_handicap_b", libelle: "Garde d'enfant(s) en situation de handicap B", domaine: "enfant", echelle: 5, rome: "K1303", resume: "Handicap reconnu : réalise à la place de l'enfant les gestes essentiels, prévient les situations de crise." },
  { cle: "garde_handicap_c", libelle: "Garde d'enfant(s) en situation de handicap C", domaine: "enfant", echelle: 6, rome: "K1303", resume: "Comme B, avec la coordination des rendez-vous et des professionnels de santé de l'enfant." },
  // Annexe B — Domaine Adulte
  { cle: "accompagnateur", libelle: "Accompagnateur(rice) / Personne de compagnie", domaine: "adulte", echelle: 2, rome: "K1302", resume: "Tenir compagnie, accompagner dans les loisirs et les sorties, à domicile ou à l'extérieur." },
  { cle: "assistant_vie_a", libelle: "Assistant(e) de vie A", domaine: "adulte", echelle: 3, rome: "K1302", resume: "Aide au quotidien d'une personne autonome : courses, ménage, linge, repas courants, papiers, sorties." },
  { cle: "assistant_vie_b", libelle: "Assistant(e) de vie B", domaine: "adulte", echelle: 4, rome: "K1302", resume: "Comme A, avec l'aide au repas, à la toilette simple, à l'habillage et aux déplacements dans le logement." },
  { cle: "assistant_vie_c", libelle: "Assistant(e) de vie C", domaine: "adulte", echelle: 5, rome: "K1302", resume: "Personne dépendante : prépare les repas spécifiques (sans sel, sans sucre…), aide aux transferts et aux soins d'hygiène." },
  { cle: "assistant_vie_d", libelle: "Assistant(e) de vie D", domaine: "adulte", echelle: 6, rome: "K1302", resume: "Comme C, avec des gestes de soins délégués, appris avec un médecin ou un infirmier (personne en situation de handicap)." },
  // Annexe C — Domaine Espaces de vie
  { cle: "employe_familial_a", libelle: "Employé(e) familial(e) A", domaine: "espaces_de_vie", echelle: 1, rome: "K1304", resume: "Ménage du logement (sols, meubles, vitres, sanitaires), repassage et pliage du linge courant." },
  { cle: "employe_familial_b", libelle: "Employé(e) familial(e) B", domaine: "espaces_de_vie", echelle: 2, rome: "K1304", resume: "Comme A, avec l'entretien du linge délicat, les courses et les repas courants." },
  { cle: "employe_familial_enfants", libelle: "Employé(e) familial(e) auprès d'enfant(s)", domaine: "espaces_de_vie", echelle: 3, rome: "K1304", resume: "Comme B, avec la présence auprès d'enfants de plus de 3 ans et la surveillance des devoirs." },
  // Annexe D — Domaine Environnement technique
  { cle: "secretaire", libelle: "Secrétaire particulier(ère)", domaine: "environnement_technique", echelle: 3, rome: "M1607", resume: "Courrier, recherches, démarches administratives, budget du foyer, classement." },
  { cle: "enseignant_a", libelle: "Enseignant(e) particulier(ère) A (école élémentaire)", domaine: "environnement_technique", echelle: 6, resume: "Cours et soutien scolaire de niveau élémentaire." },
  { cle: "enseignant_b", libelle: "Enseignant(e) particulier(ère) B (collège, lycée)", domaine: "environnement_technique", echelle: 7, resume: "Cours de niveau collège ou lycée, préparation des examens, méthode de travail." },
  { cle: "enseignant_c", libelle: "Enseignant(e) particulier(ère) C (études supérieures)", domaine: "environnement_technique", echelle: 8, resume: "Cours de niveau supérieur, préparation de concours." },
  { cle: "informatique_a", libelle: "Assistant(e) informatique A", domaine: "environnement_technique", echelle: 6, rome: "I1401", resume: "Installation et réglage du matériel, dépannage." },
  { cle: "informatique_b", libelle: "Assistant(e) informatique B", domaine: "environnement_technique", echelle: 7, rome: "I1401", resume: "Comme A, avec l'initiation à l'informatique (traitement de texte, internet, messagerie, tableur)." },
  // Annexe E — Domaine Environnement externe
  { cle: "entretien_a", libelle: "Employé(e) d'entretien et petits travaux A", domaine: "environnement_externe", echelle: 1, resume: "Petit bricolage, entretien des extérieurs (pelouse, feuilles, mobilier de jardin)." },
  { cle: "entretien_b", libelle: "Employé(e) d'entretien et petits travaux B", domaine: "environnement_externe", echelle: 2, resume: "Comme A, avec le jardinage (taille, rempotage) et l'entretien du bassin ou de la piscine." },
  { cle: "gardien_a", libelle: "Gardien(ne) A", domaine: "environnement_externe", echelle: 2, resume: "Surveillance de la propriété, accès, entretien des abords, petits travaux." },
  { cle: "gardien_b", libelle: "Gardien(ne) B", domaine: "environnement_externe", echelle: 3, resume: "Comme A, avec des tâches variées : animaux, piscine, lavage de voiture, rangement du bois." },
];

export interface Categorie {
  cle: "garde" | "garde_partagee" | "menage" | "assistance" | "technique" | "exterieur";
  titre: string;
  description: string;
  type_gestion: TypeGestion;
  garde_partagee?: boolean;
  domaine: Domaine;
  /** Emploi-repère proposé d'office (le plus fréquent chez nos abonnés). */
  emploiParDefaut: string;
  /** Tâches proposées en cases à cocher. */
  taches: string[];
  /** Exemples pour la case « précisions ». */
  exemples: string;
}

const TACHES_ENFANT = [
  "Jeux et activités d'éveil (lecture, musique, dessin)",
  "Aller chercher les enfants à l'école ou à la crèche",
  "Accompagner aux activités extrascolaires",
  "Promenade ou sortie quotidienne",
  "Préparer et donner les repas, le goûter",
  "Soins : change, toilette, bain, habillage",
  "Surveiller les devoirs",
  "Ranger et entretenir la chambre et les jouets",
  "Entretien du linge des enfants",
  "Courses pour les enfants",
  "Accompagner chez le médecin",
  "Trajets en transports en commun avec les enfants",
  "Trajets avec son propre véhicule",
  "Cahier de liaison avec les parents",
];

export const CATEGORIES: Categorie[] = [
  {
    cle: "garde",
    titre: "Garde d'enfants à domicile",
    description: "Nounou, sortie d'école, baby-sitting régulier.",
    type_gestion: "garde_enfants",
    domaine: "enfant",
    emploiParDefaut: "garde_a",
    taches: TACHES_ENFANT,
    exemples: "ex. sortie d'école à 16 h 30, goûter, bain ; mercredi : conservatoire à 14 h",
  },
  {
    cle: "garde_partagee",
    titre: "Garde partagée",
    description: "Une même nounou pour vos enfants et ceux d'une autre famille.",
    type_gestion: "garde_enfants",
    garde_partagee: true,
    domaine: "enfant",
    emploiParDefaut: "garde_a",
    taches: TACHES_ENFANT,
    exemples: "ex. garde alternée une semaine chez nous, une semaine chez la famille Martin",
  },
  {
    cle: "menage",
    titre: "Ménage, repassage, courses",
    description: "Employé(e) familial(e) : entretien du logement et du linge, repas.",
    type_gestion: "employe_maison",
    domaine: "espaces_de_vie",
    emploiParDefaut: "employe_familial_a",
    taches: [
      "Ménage du logement (sols, meubles, sanitaires, vitres)",
      "Repassage et pliage du linge courant",
      "Entretien du linge délicat (tri, lavage, séchage, rangement)",
      "Courses du quotidien",
      "Préparation des repas courants",
      "Présence auprès d'enfants de plus de 3 ans",
      "Surveillance des devoirs",
    ],
    exemples: "ex. grand ménage le lundi, repassage le jeudi ; arrosage des plantes",
  },
  {
    cle: "assistance",
    titre: "Aide à une personne âgée ou en situation de handicap",
    description: "Assistant(e) de vie, personne de compagnie.",
    type_gestion: "aide_domicile",
    domaine: "adulte",
    emploiParDefaut: "assistant_vie_a",
    taches: [
      "Compagnie, sorties et loisirs",
      "Courses",
      "Ménage et entretien du linge",
      "Repas courants",
      "Repas spécifiques (sans sel, sans sucre…)",
      "Aide aux repas",
      "Aide à la toilette et à l'habillage",
      "Aide aux déplacements dans le logement et aux transferts",
      "Courrier et papiers administratifs",
      "Gestes de soins délégués (avec l'accord du médecin ou de l'infirmier)",
    ],
    exemples: "ex. lever et petit-déjeuner, courses le mardi, accompagnement chez le kinésithérapeute",
  },
  {
    cle: "technique",
    titre: "Cours particuliers, secrétariat, informatique",
    description: "Soutien scolaire, secrétaire particulier, assistance informatique.",
    type_gestion: "environnement_technique",
    domaine: "environnement_technique",
    emploiParDefaut: "enseignant_a",
    taches: [
      "Cours ou soutien scolaire",
      "Préparation d'examens ou de concours",
      "Courrier, démarches et classement",
      "Suivi du budget du foyer",
      "Installation et dépannage informatique",
      "Initiation à l'informatique",
    ],
    exemples: "ex. maths et physique niveau 3e, deux heures le mercredi",
  },
  {
    cle: "exterieur",
    titre: "Jardinage, petits travaux, gardiennage",
    description: "Entretien du jardin et des extérieurs, bricolage, surveillance de la maison.",
    type_gestion: "environnement_externe",
    domaine: "environnement_externe",
    emploiParDefaut: "entretien_a",
    taches: [
      "Tonte, ramassage des feuilles, entretien des extérieurs",
      "Taille, plantations, rempotage",
      "Entretien du bassin ou de la piscine",
      "Petit bricolage",
      "Surveillance de la propriété",
      "Soins des animaux",
    ],
    exemples: "ex. tonte et taille de haies une fois par semaine d'avril à octobre",
  },
];

export function categorie(cle: string | undefined): Categorie | undefined {
  return CATEGORIES.find((c) => c.cle === cle);
}

/** Catégorie déduite d'une gestion existante (anciennes gestions sans catégorie). */
export function categorieDeLaGestion(type: TypeGestion, gardePartagee?: string): Categorie {
  if (type === "garde_enfants") return categorie(gardePartagee === "oui" ? "garde_partagee" : "garde")!;
  return CATEGORIES.find((c) => c.type_gestion === type) ?? CATEGORIES[0];
}

export function emploiRepere(cle: string | undefined): EmploiRepere | undefined {
  return EMPLOIS_REPERES_CCN.find((e) => e.cle === cle);
}

export function emploisDeLaCategorie(c: Categorie): EmploiRepere[] {
  return EMPLOIS_REPERES_CCN.filter((e) => e.domaine === c.domaine);
}

const ROMAINS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export function echelleEnRomain(n: number): string {
  return ROMAINS[n] ?? String(n);
}

/**
 * Intitulé, niveau et code ROME à porter sur un formulaire officiel : ceux
 * de l'emploi-repère choisi, sinon ceux proposés d'office pour la catégorie.
 */
export function posteDeLaGestion(type: TypeGestion, details: Record<string, string>): { emploi: string; niveau: string; rome: string } {
  const cat = categorie(details.categorie) ?? categorieDeLaGestion(type, details.garde_partagee);
  const e = emploiRepere(details.emploi_repere) ?? emploiRepere(cat.emploiParDefaut);
  return { emploi: e?.libelle ?? "", niveau: e ? String(e.echelle) : "", rome: e?.rome ?? "" };
}
