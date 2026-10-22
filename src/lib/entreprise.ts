/**
 * Identité légale d'Aide & Garde, reprise par les mentions légales, la
 * politique de confidentialité et les CGV (obligations rappelées par
 * service-public.gouv.fr, fiche F37351, vérifiée le 13/10/2026).
 *
 * Sources : extrait Kbis du 04/03/2025, récépissé de déclaration SAP du
 * 23/07/2018, espace NOVA (transmis par Frédéric le 22/10/2026).
 *
 * Les valeurs `null` sont À COMPLÉTER par Frédéric : elles s'affichent en
 * jaune « à compléter » sur les pages, pour ne pas mettre en ligne une
 * information inventée. Le site ne doit pas ouvrir au public tant qu'il en
 * reste (voir docs/specifications-fonctionnelles.md, § 9).
 */
export const ENTREPRISE = {
  nomCommercial: "Aide & Garde",
  denomination: "Aide et Garde" as string | null, // Kbis
  formeJuridique: "société par actions simplifiée à associé unique (SASU)" as string | null,
  capital: "5 000 €" as string | null,
  siege: "131 rue du Temple, 75003 Paris" as string | null,
  rcs: "RCS Paris 838 154 383" as string | null,
  siret: "838 154 383 00015",
  // N° de TVA intracommunautaire : aucun, la société n'est pas assujettie
  // (Frédéric, 23/10/2026). À renseigner si cela change.
  tva: null as string | null,
  /**
   * Taux de TVA appliqué à l'abonnement (frais de mandat) : 20 si la
   * société est assujettie, 0 si elle relève de la franchise en base
   * (« TVA non applicable, article 293 B du CGI »). null : à compléter.
   * Les prix des formules (src/lib/formules.ts) sont TTC.
   */
  tauxTva: 0 as number | null, // franchise en base (Frédéric, 23/10/2026)
  directeurPublication: "Frédéric Zydownik, président" as string | null,
  telephone: "01 88 320 118",
  email: "contact@aideetgarde.fr",
  // Services à la personne : déclaration (mode mandataire).
  numeroSap: "838154383",
  sap: "n° SAP 838154383, déclaration du 21/06/2018 (récépissé du 23/07/2018)" as string | null,
  sapAutorite:
    "DREETS Île-de-France, unité départementale de Paris (ex-DIRECCTE), 35 rue de la Gare, 75144 Paris Cedex 19" as
      | string
      | null,
  // Médiateur de la consommation (obligatoire pour vendre à des particuliers).
  mediateur: null as string | null, // nom de l'organisme
  mediateurSite: null as string | null, // adresse du site de saisine
};

/**
 * Activités déclarées (récépissé du 23/07/2018), toutes en mode mandataire.
 * À afficher sur le site (arrêté du 17 mars 2015, art. 3). Toute nouvelle
 * activité demande une déclaration modificative préalable.
 */
export const ACTIVITES_DECLAREES = [
  "Entretien de la maison et travaux ménagers",
  "Petits travaux de jardinage",
  "Travaux de petit bricolage",
  "Garde d'enfants de plus de 3 ans à domicile",
  "Soutien scolaire ou cours à domicile",
  "Soins d'esthétique à domicile des personnes dépendantes",
  "Assistance informatique à domicile",
  "Soins et promenade d'animaux de compagnie pour les personnes dépendantes (hors soins vétérinaires et toilettage)",
  "Maintenance et vigilance temporaires à domicile de la résidence principale et secondaire",
  "Assistance administrative à domicile",
  "Accompagnement des enfants de plus de 3 ans en dehors de leur domicile",
  "Coordination et délivrance des services à la personne",
];

/**
 * Charte nationale Qualité des services à la personne (adhésion gérée sur
 * NOVA). Logo transmis par NOVA pour 2024 ; à remplacer par le logo de
 * l'année en cours dès que NOVA le fournit.
 */
export const CHARTE_QUALITE = {
  adherent: true,
  annee: "2024",
  logo: "/charte-qualite-sap.png",
  lien: "https://www.servicesalapersonne.gouv.fr/",
};

/**
 * Mentions imposées pour les services à la personne en mode mandataire
 * (arrêté du 17 mars 2015 relatif à l'information préalable du
 * consommateur) : sur les informations de prix, les devis et la première
 * page du contrat.
 */
export const MENTION_MANDATAIRE =
  "Attention, dans le cadre d'un contrat de placement de travailleurs, le consommateur est l'employeur de la personne qui effectue la prestation à son domicile. En cette qualité d'employeur, le consommateur est soumis à diverses obligations résultant notamment du code du travail et du code de la sécurité sociale.";

export const MENTION_DEVIS =
  "Le vendeur remet gratuitement un devis personnalisé au consommateur à qui il propose une prestation ou un ensemble de prestations dont le prix total est supérieur ou égal à 100 € TTC ou au consommateur qui lui en fait la demande.";

/** Prix hors taxe d'un prix TTC, selon le taux renseigné (null si inconnu). */
export function prixHT(ttc: number): number | null {
  const t = ENTREPRISE.tauxTva;
  if (t === null) return null;
  return Math.round((ttc / (1 + t / 100)) * 100) / 100;
}

/** Libellé de TVA à côté des prix (null si le taux n'est pas renseigné). */
export function libelleTva(): string | null {
  const t = ENTREPRISE.tauxTva;
  if (t === null) return null;
  if (t === 0) return "TVA non applicable, article 293 B du code général des impôts";
  return `dont TVA à ${t} %`;
}

export const HEBERGEURS = [
  {
    role: "Hébergement du site",
    nom: "Vercel Inc.",
    adresse: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    contact: "vercel.com",
    lieu: "Serveurs du site à Paris (région cdg1)",
  },
];

/** Version des CGV acceptée à la souscription (à changer à chaque modification). */
export const VERSION_CGV = "2026-10-22";
