/**
 * Identité légale d'Aide & Garde, reprise par les mentions légales, la
 * politique de confidentialité et les CGV (obligations rappelées par
 * service-public.gouv.fr, fiche F37351, vérifiée le 13/10/2026).
 *
 * Les valeurs `null` sont À COMPLÉTER par Frédéric : elles s'affichent en
 * jaune « à compléter » sur les pages, pour ne pas mettre en ligne une
 * information inventée. Le site ne doit pas ouvrir au public tant qu'il en
 * reste (voir docs/specifications-fonctionnelles.md, § 9).
 */
export const ENTREPRISE = {
  nomCommercial: "Aide & Garde",
  denomination: null as string | null, // raison sociale (Kbis)
  formeJuridique: null as string | null, // SAS, SARL, EI…
  capital: null as string | null, // ex. « 10 000 € »
  siege: null as string | null, // adresse du siège social
  rcs: null as string | null, // ex. « RCS Paris 123 456 789 » (ou numéro RNE)
  tva: null as string | null, // n° de TVA intracommunautaire, si assujetti
  // Affichage des prix dans les CGV : « toutes taxes comprises (TVA à 20 %) »
  // ou « TVA non applicable, article 293 B du CGI » selon le régime.
  mentionPrix: null as string | null,
  directeurPublication: null as string | null, // nom du représentant légal en général
  telephone: "01 88 320 118",
  email: "contact@aideetgarde.fr",
  // Services à la personne : déclaration ou agrément (mandataire). Activité
  // réglementée : numéro et autorité qui l'a délivré.
  sap: null as string | null, // ex. « SAP123456789, déclaration du jj/mm/aaaa »
  sapAutorite: null as string | null, // ex. « DREETS Île-de-France »
  // Médiateur de la consommation (obligatoire pour vendre à des particuliers).
  mediateur: null as string | null, // nom de l'organisme
  mediateurSite: null as string | null, // adresse du site de saisine
};

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
