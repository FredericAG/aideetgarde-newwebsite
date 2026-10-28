/**
 * Champs du formulaire « Nouvelle gestion » (version 2 du 25/10/2026), revus
 * à partir du tableau des champs du site actuel (« Champs contrats gestion
 * admin 2021 ») : mêmes informations, réorganisées en étapes, simplifiées
 * pour un particulier, et mises à jour (classification 2026 de la convention
 * collective, valeurs chiffrées retirées des aides car elles changent chaque
 * année : Aide & Garde applique les montants en vigueur).
 *
 * Règle de partage : les champs dont le site a besoin pour raisonner
 * (emploi, contrat, dates, heures, salaire) sont des colonnes de la table
 * `gestions` (traités par le formulaire lui-même) ; tous les autres sont
 * décrits ICI et enregistrés ensemble dans la colonne `config` (JSON).
 * Ajouter, retirer, renommer un champ, le rendre obligatoire ou changer sa
 * condition d'affichage se fait dans ce seul fichier, sans script de base.
 *
 * - `obligatoire` : exigé pour ENVOYER (le brouillon accepte tout). Sont
 *   obligatoires les informations sans lesquelles Aide & Garde ne peut pas
 *   établir le contrat ou préremplir les courriers et formulaires officiels
 *   (date et lieu de naissance, adresse…).
 * - `si` : condition d'affichage (un champ masqué n'est ni exigé ni gardé).
 * - `categories` : catégories d'emploi concernées (toutes si absent).
 * - `colonne` : le champ est rangé dans une colonne de la gestion.
 */
import type { TypeGestion } from "@/lib/data";
import { categorie as trouverCategorie, type Categorie } from "./classification";

export type TypeChamp =
  | "texte"
  | "textarea"
  | "date"
  | "heure"
  | "nombre"
  | "montant"
  | "choix"
  | "oui_non"
  | "multi"
  | "enfants"
  | "telephone"
  | "email"
  /** Tableau des horaires par jour (JSON, voir lirePlanning). */
  | "planning";

export type Valeurs = Record<string, string>;

export interface ContexteChamps {
  type_gestion: TypeGestion;
  /** Catégorie choisie à la première étape (src/lib/contrat/classification.ts). */
  categorie: Categorie["cle"] | "";
  type_contrat: string;
  remplacement: boolean;
}

export type CleEtape = "categorie" | "salarie" | "poste" | "contrat" | "horaires" | "remuneration" | "envoi";

export interface Option {
  valeur: string;
  libelle: string;
}

export interface ChampContrat {
  cle: string;
  etape: CleEtape;
  libelle: string;
  type: TypeChamp;
  aide?: string | ((c: ContexteChamps) => string);
  placeholder?: string | ((c: ContexteChamps) => string);
  options?: Option[] | ((c: ContexteChamps) => Option[]);
  obligatoire?: boolean | ((c: ContexteChamps, v: Valeurs) => boolean);
  si?: (v: Valeurs, c: ContexteChamps) => boolean;
  categories?: Categorie["cle"][];
  colonne?: "civilite_salarie" | "adresse_salarie" | "code_postal_salarie" | "ville_salarie";
  /** Valeur proposée pour une nouvelle gestion. */
  defaut?: (c: ContexteChamps) => string;
  /** Sur ordinateur : la moitié de la ligne (par défaut) ou toute la ligne. */
  largeur?: "demi" | "entier";
  /** Saisie d'adresse avec suggestions (groupe adresse / code postal / ville). */
  adresse?: "rue" | "code_postal" | "ville";
}

export const ETAPES: { cle: CleEtape; titre: string; court: string }[] = [
  { cle: "categorie", titre: "Le type d'emploi", court: "Emploi" },
  { cle: "salarie", titre: "Votre salarié", court: "Salarié" },
  { cle: "poste", titre: "Le poste", court: "Poste" },
  { cle: "contrat", titre: "Le contrat", court: "Contrat" },
  { cle: "horaires", titre: "Les horaires", court: "Horaires" },
  { cle: "remuneration", titre: "Salaire et congés", court: "Salaire" },
  { cle: "envoi", titre: "Vérifier et envoyer", court: "Envoi" },
];

const oui = (v: Valeurs, cle: string) => v[cle] === "oui";
const GARDE: Categorie["cle"][] = ["garde", "garde_partagee"];
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"].map((j) => ({
  valeur: j,
  libelle: j.charAt(0).toUpperCase() + j.slice(1),
}));
const FERIES = [
  "1er janvier",
  "Lundi de Pâques",
  "1er mai",
  "8 mai",
  "Ascension",
  "Lundi de Pentecôte",
  "14 juillet",
  "15 août",
  "1er novembre",
  "11 novembre",
  "25 décembre",
].map((j) => ({ valeur: j, libelle: j }));

export const CHAMPS: ChampContrat[] = [
  // --- Étape 1 : le type d'emploi (la catégorie elle-même est choisie par
  // des tuiles dans le formulaire) ---------------------------------------------
  {
    cle: "employeur_tiers",
    etape: "categorie",
    libelle: "Êtes-vous vous-même l'employeur ?",
    type: "choix",
    options: [
      { valeur: "non", libelle: "Oui, c'est moi" },
      { valeur: "oui", libelle: "Non (un parent, un proche…)" },
    ],
    defaut: () => "non",
    largeur: "entier",
    aide: "Par exemple, vous gérez l'emploi d'une aide à domicile pour votre mère : l'employeur, c'est elle.",
  },
  { cle: "employeur_civilite", etape: "categorie", libelle: "Civilité de l'employeur", type: "choix", options: [{ valeur: "Madame", libelle: "Madame" }, { valeur: "Monsieur", libelle: "Monsieur" }], si: (v) => oui(v, "employeur_tiers"), obligatoire: (_c, v) => oui(v, "employeur_tiers") },
  { cle: "employeur_prenom", etape: "categorie", libelle: "Prénom de l'employeur", type: "texte", si: (v) => oui(v, "employeur_tiers"), obligatoire: (_c, v) => oui(v, "employeur_tiers") },
  { cle: "employeur_nom", etape: "categorie", libelle: "Nom de l'employeur", type: "texte", si: (v) => oui(v, "employeur_tiers"), obligatoire: (_c, v) => oui(v, "employeur_tiers") },
  { cle: "employeur_date_naissance", etape: "categorie", libelle: "Date de naissance de l'employeur", type: "date", si: (v) => oui(v, "employeur_tiers"), obligatoire: (_c, v) => oui(v, "employeur_tiers") },
  { cle: "employeur_lien", etape: "categorie", libelle: "Votre lien avec l'employeur", type: "texte", placeholder: "ex. fille, tuteur", si: (v) => oui(v, "employeur_tiers") },
  { cle: "employeur_adresse", etape: "categorie", libelle: "Adresse de l'employeur", type: "texte", adresse: "rue", largeur: "entier", si: (v) => oui(v, "employeur_tiers"), obligatoire: (_c, v) => oui(v, "employeur_tiers") },
  { cle: "employeur_code_postal", etape: "categorie", libelle: "Code postal", type: "texte", adresse: "code_postal", si: (v) => oui(v, "employeur_tiers"), obligatoire: (_c, v) => oui(v, "employeur_tiers") },
  { cle: "employeur_ville", etape: "categorie", libelle: "Ville", type: "texte", adresse: "ville", si: (v) => oui(v, "employeur_tiers"), obligatoire: (_c, v) => oui(v, "employeur_tiers") },

  // --- Étape 2 : le salarié ----------------------------------------------------
  {
    cle: "civilite_salarie",
    colonne: "civilite_salarie",
    etape: "salarie",
    libelle: "Civilité",
    type: "choix",
    options: [
      { valeur: "Madame", libelle: "Madame" },
      { valeur: "Monsieur", libelle: "Monsieur" },
    ],
    obligatoire: true,
  },
  { cle: "nom_naissance", etape: "salarie", libelle: "Nom de naissance (s'il est différent)", type: "texte" },
  { cle: "date_naissance", etape: "salarie", libelle: "Date de naissance", type: "date", obligatoire: true },
  { cle: "ville_naissance", etape: "salarie", libelle: "Ville de naissance", type: "texte", obligatoire: true },
  { cle: "pays_naissance", etape: "salarie", libelle: "Pays de naissance", type: "texte", defaut: () => "France", obligatoire: true },
  {
    cle: "nationalite",
    etape: "salarie",
    libelle: "Nationalité",
    type: "choix",
    largeur: "entier",
    options: [
      { valeur: "francaise", libelle: "Française" },
      { valeur: "ue", libelle: "Union européenne, Espace économique européen ou Suisse" },
      { valeur: "autre", libelle: "Autre" },
    ],
    obligatoire: true,
  },
  { cle: "nationalite_pays", etape: "salarie", libelle: "Pays de nationalité", type: "texte", si: (v) => v.nationalite === "autre" || v.nationalite === "ue", obligatoire: (_c, v) => v.nationalite === "autre" },
  {
    cle: "titre_sejour_type",
    etape: "salarie",
    libelle: "Titre qui l'autorise à travailler",
    type: "choix",
    options: [
      { valeur: "carte_sejour", libelle: "Carte de séjour (salarié, vie privée et familiale…)" },
      { valeur: "carte_resident", libelle: "Carte de résident" },
      { valeur: "recepisse", libelle: "Récépissé de demande de titre" },
      { valeur: "autorisation_provisoire", libelle: "Autorisation provisoire de séjour" },
      { valeur: "aucun", libelle: "Aucun pour le moment" },
    ],
    si: (v) => v.nationalite === "autre",
    obligatoire: (_c, v) => v.nationalite === "autre",
    aide: "Vous devez vérifier ce titre avant l'embauche ; joignez-en une copie au contrat. Sans titre : voir « Puis-je employer une personne en situation irrégulière ? » dans l'aide.",
  },
  { cle: "titre_sejour_numero", etape: "salarie", libelle: "Numéro du titre", type: "texte", si: (v) => v.nationalite === "autre" && v.titre_sejour_type !== "aucun" },
  { cle: "titre_sejour_expiration", etape: "salarie", libelle: "Valable jusqu'au", type: "date", si: (v) => v.nationalite === "autre" && v.titre_sejour_type !== "aucun" },
  // Pièce d'identité d'un salarié étranger (hors UE) : facultative, reprise
  // dans la demande d'autorisation de travail (cerfa 15186, cadre 3.1).
  {
    cle: "piece_identite_type",
    etape: "salarie",
    libelle: "Pièce d'identité",
    type: "choix",
    options: [
      { valeur: "passeport", libelle: "Passeport" },
      { valeur: "cni", libelle: "Carte d'identité" },
    ],
    si: (v) => v.nationalite === "autre",
    aide: "Facultatif. Utile pour une demande d'autorisation de travail : elle sera alors préremplie.",
  },
  { cle: "piece_identite_numero", etape: "salarie", libelle: "Numéro de la pièce", type: "texte", si: (v) => v.nationalite === "autre" && Boolean(v.piece_identite_type) },
  { cle: "piece_identite_delivrance", etape: "salarie", libelle: "Délivrée le", type: "date", si: (v) => v.nationalite === "autre" && Boolean(v.piece_identite_type) },
  { cle: "piece_identite_expiration", etape: "salarie", libelle: "Expire le", type: "date", si: (v) => v.nationalite === "autre" && Boolean(v.piece_identite_type) },
  { cle: "piece_identite_autorite", etape: "salarie", libelle: "Délivrée par", type: "texte", placeholder: "ex. République du Sénégal", si: (v) => v.nationalite === "autre" && Boolean(v.piece_identite_type) },
  { cle: "adresse_salarie", colonne: "adresse_salarie", etape: "salarie", libelle: "Adresse", type: "texte", obligatoire: true, largeur: "entier", adresse: "rue" },
  { cle: "code_postal_salarie", colonne: "code_postal_salarie", etape: "salarie", libelle: "Code postal", type: "texte", obligatoire: true, adresse: "code_postal" },
  { cle: "ville_salarie", colonne: "ville_salarie", etape: "salarie", libelle: "Ville", type: "texte", obligatoire: true, adresse: "ville" },
  { cle: "telephone_salarie", etape: "salarie", libelle: "Téléphone", type: "telephone" },
  { cle: "email_salarie", etape: "salarie", libelle: "Email", type: "email" },
  {
    cle: "numero_securite_sociale",
    etape: "salarie",
    libelle: "Numéro de sécurité sociale",
    type: "texte",
    placeholder: "15 chiffres",
    aide:
      "Sur sa carte Vitale. Pas encore de numéro (salarié arrivé de l'étranger, par exemple) ? Ce n'est pas bloquant : laissez vide. Il est déclaré avec son état civil et l'Urssaf lui attribue un numéro provisoire. Le numéro de la carte AME n'est pas un numéro de sécurité sociale.",
  },

  // --- Étape 3 : le poste ------------------------------------------------------
  // (l'emploi-repère est choisi par des cartes dans le formulaire : champ
  // « emploi_repere » enregistré dans la config.)
  {
    cle: "taches",
    etape: "poste",
    libelle: "Tâches confiées",
    type: "multi",
    options: (c) => (trouverCategorie(c.categorie)?.taches ?? []).map((t) => ({ valeur: t, libelle: t })),
    largeur: "entier",
  },
  {
    cle: "precisions_taches",
    etape: "poste",
    libelle: "Précisions sur les tâches",
    type: "textarea",
    placeholder: (c) => trouverCategorie(c.categorie)?.exemples ?? "",
    largeur: "entier",
  },
  {
    cle: "enfants",
    etape: "poste",
    libelle: "Enfants gardés",
    type: "enfants",
    categories: GARDE,
    obligatoire: true,
    largeur: "entier",
    aide: "Prénom, nom et date de naissance de chaque enfant (4 au plus).",
  },
  { cle: "famille_partenaire_nom", etape: "poste", libelle: "Nom de l'autre famille", type: "texte", categories: ["garde_partagee"], obligatoire: true },
  { cle: "famille_partenaire_adresse", etape: "poste", libelle: "Adresse de l'autre famille", type: "texte", categories: ["garde_partagee"], obligatoire: true, largeur: "entier" },
  { cle: "famille_partenaire_enfants", etape: "poste", libelle: "Enfants de l'autre famille (prénom, date de naissance)", type: "textarea", categories: ["garde_partagee"], largeur: "entier" },
  { cle: "personne_aidee", etape: "poste", libelle: "Personne aidée, si ce n'est pas l'employeur", type: "texte", categories: ["assistance"] },
  { cle: "lieu_travail_autre", etape: "poste", libelle: "Le travail se fait-il ailleurs qu'au domicile de l'employeur ?", type: "oui_non" },
  { cle: "lieu_travail_adresse", etape: "poste", libelle: "Adresse du lieu de travail", type: "texte", si: (v) => oui(v, "lieu_travail_autre"), obligatoire: (_c, v) => oui(v, "lieu_travail_autre"), largeur: "entier" },

  // --- Étape 4 : le contrat (type, dates : formulaire) ---------------------------
  {
    cle: "motif_cdd",
    etape: "contrat",
    libelle: "Motif du CDD",
    type: "choix",
    options: (c) => [
      { valeur: "remplacement", libelle: "Remplacer un salarié absent" },
      ...(c.categorie === "garde_partagee" ? [] : [{ valeur: "accroissement", libelle: "Besoin temporaire plus important" }]),
    ],
    si: (_v, c) => c.type_contrat === "CDD" && !c.remplacement,
    obligatoire: (c) => c.type_contrat === "CDD" && !c.remplacement,
  },
  {
    cle: "personne_remplacee",
    etape: "contrat",
    libelle: "Personne remplacée et motif de son absence",
    type: "texte",
    placeholder: "ex. Marie Durand, congé parental",
    si: (v, c) => c.type_contrat === "CDD" && !c.remplacement && v.motif_cdd === "remplacement",
    obligatoire: (c, v) => c.type_contrat === "CDD" && !c.remplacement && v.motif_cdd === "remplacement",
  },
  {
    cle: "precision_besoin_temporaire",
    etape: "contrat",
    libelle: "Raison du besoin temporaire",
    type: "texte",
    si: (v, c) => c.type_contrat === "CDD" && v.motif_cdd === "accroissement",
    obligatoire: (c, v) => c.type_contrat === "CDD" && v.motif_cdd === "accroissement",
  },
  {
    cle: "periode_essai",
    etape: "contrat",
    libelle: "Période d'essai",
    type: "choix",
    // Trois choix seulement (retour du 27/10) ; en CDD, pas de durée « plus
    // courte » : celle du CDD est déjà très brève.
    options: (c) => [
      { valeur: "aucune", libelle: "Sans période d'essai" },
      { valeur: "convention", libelle: "Convention collective (conseillé)" },
      ...(c.type_contrat === "CDD" ? [] : [{ valeur: "courte", libelle: "Plus courte : 15 jours" }]),
    ],
    defaut: () => "convention",
    aide: (c) =>
      c.type_contrat === "CDD"
        ? "Convention collective, en CDD : 1 jour par semaine de contrat, 2 semaines au plus pour un contrat de 6 mois ou moins, 1 mois au-delà. Nous vous conseillons de la garder."
        : "Convention collective, en CDI : 1 mois, renouvelable une fois (prévu au contrat et annoncé par écrit au salarié), soit 2 mois au plus. Nous vous conseillons de la garder : elle laisse le temps de vérifier que tout se passe bien.",
  },
  {
    cle: "periode_adaptation",
    etape: "contrat",
    libelle: "Une période d'adaptation de l'enfant est-elle prévue ?",
    type: "oui_non",
    categories: GARDE,
    aide: "Un mois au plus, pendant la période d'essai : horaires d'accueil progressifs selon les besoins de l'enfant.",
  },
  { cle: "periode_adaptation_modalites", etape: "contrat", libelle: "Durée et horaires de l'adaptation", type: "texte", si: (v) => oui(v, "periode_adaptation"), largeur: "entier" },

  // --- Étape 5 : les horaires (nombre d'heures : formulaire) ---------------------
  { cle: "jours_presence", etape: "horaires", libelle: "Jours de travail", type: "multi", options: JOURS, obligatoire: true, largeur: "entier" },
  // Détail par jour : affiché quand l'abonné coche « Je veux préciser le
  // détail par jour » à côté du nombre d'heures (retour du 27/10). Il
  // remplace alors les heures habituelles et la présence responsable.
  { cle: "planning_jours", etape: "horaires", libelle: "Détail par jour", type: "planning", si: (v) => v.detail_par_jour === "oui" },
  { cle: "heure_arrivee", etape: "horaires", libelle: "Heure d'arrivée habituelle", type: "heure", si: (v) => v.detail_par_jour !== "oui" },
  { cle: "heure_depart", etape: "horaires", libelle: "Heure de départ habituelle", type: "heure", si: (v) => v.detail_par_jour !== "oui" },
  {
    cle: "organisation",
    etape: "horaires",
    libelle: "Si les horaires changent selon les jours, précisez",
    type: "textarea",
    placeholder: "ex. lundi et jeudi de 16 h 30 à 19 h 30, mercredi de 8 h 30 à 18 h",
    largeur: "entier",
    si: (v) => v.detail_par_jour !== "oui",
  },
  {
    cle: "heures_presence_responsable",
    etape: "horaires",
    libelle: "Dont heures de présence responsable (par semaine)",
    type: "nombre",
    categories: ["garde", "garde_partagee", "assistance"],
    si: (v) => v.detail_par_jour !== "oui",
    aide: "Temps où le salarié peut vaquer à ses occupations tout en restant vigilant (ex. sieste des enfants) : rémunéré aux deux tiers.",
  },
  {
    cle: "heures_nuit",
    etape: "horaires",
    libelle: "Dont heures de garde la nuit, le dimanche ou un jour férié (par semaine)",
    type: "nombre",
    categories: GARDE,
    aide:
      "Garde entre 22 h et 6 h, le dimanche ou un jour férié parce que vous-même travaillez à ces horaires (obligation professionnelle) : la CAF augmente alors son aide (« horaires spécifiques »). À ne pas confondre avec la « présence de nuit » de la convention collective, où le salarié dort sur place dans une pièce séparée pour pouvoir intervenir : indiquez-la dans les précisions, nous la prévoyons au contrat.",
  },
  { cle: "heures_garde_simple", etape: "horaires", libelle: "Heures en garde simple (vos enfants seuls) par semaine", type: "nombre", categories: ["garde_partagee"] },
  { cle: "heures_garde_partagee", etape: "horaires", libelle: "Heures en garde partagée par semaine", type: "nombre", categories: ["garde_partagee"], obligatoire: true },
  { cle: "repartition_salaire", etape: "horaires", libelle: "Part du salaire à votre charge (%)", type: "nombre", categories: ["garde_partagee"], obligatoire: true, defaut: () => "50" },
  {
    cle: "jour_repos",
    etape: "horaires",
    libelle: "Jour de repos de la semaine",
    type: "choix",
    options: JOURS,
    defaut: () => "dimanche",
    obligatoire: true,
  },
  {
    cle: "delai_prevenance",
    etape: "horaires",
    libelle: "Délai pour prévenir d'un changement de planning",
    type: "texte",
    placeholder: "ex. une semaine",
  },

  // --- Étape 6 : salaire et congés (salaire horaire : formulaire) ---------------
  {
    cle: "conges_payes",
    etape: "remuneration",
    libelle: "Congés payés",
    type: "choix",
    options: [
      { valeur: "pendant", libelle: "Payés quand le salarié les prend (emploi régulier)" },
      { valeur: "dix_pour_cent", libelle: "10 % ajoutés à chaque salaire (emploi occasionnel)" },
    ],
    defaut: () => "pendant",
    obligatoire: true,
  },
  { cle: "transport", etape: "remuneration", libelle: "Le salarié vient en transports en commun ?", type: "oui_non", aide: "Vous lui remboursez la moitié de son abonnement : c'est obligatoire." },
  { cle: "vehicule", etape: "remuneration", libelle: "Il utilise son véhicule pour vos besoins ?", type: "oui_non", aide: "Par exemple pour conduire les enfants : vous lui versez des indemnités kilométriques." },
  { cle: "indemnite_km", etape: "remuneration", libelle: "Indemnité par kilomètre (€), si convenue", type: "montant", si: (v) => oui(v, "vehicule"), aide: "Laissez vide : nous appliquerons le barème en vigueur." },
  { cle: "indemnite_repas", etape: "remuneration", libelle: "Indemnité repas (€ par repas), si prévue", type: "montant", aide: "Facultative (une « prime panier » de quelques euros par jour pour un temps plein)." },
  { cle: "repas_fournis", etape: "remuneration", libelle: "Repas fournis par vous (par semaine)", type: "nombre", aide: "Ils sont déduits du salaire, au montant fixé chaque année." },
  { cle: "logement", etape: "remuneration", libelle: "Le salarié est logé chez vous ?", type: "oui_non" },
  { cle: "autre_indemnite", etape: "remuneration", libelle: "Autre indemnité ou avantage (motif, montant)", type: "texte", largeur: "entier" },
  {
    cle: "semaines_non_travaillees",
    etape: "remuneration",
    libelle: "Semaines non travaillées dans l'année, au-delà des 5 semaines de congés",
    type: "nombre",
    aide: "Par exemple des vacances scolaires où vous n'avez pas besoin du salarié : elles restent payées, sauf accord particulier. Nous vous conseillons.",
  },
  { cle: "periodes_conges", etape: "remuneration", libelle: "Périodes de congés souhaitées", type: "texte", placeholder: "ex. 3 semaines en août, 1 semaine à Noël", largeur: "entier" },
  { cle: "feries_travailles", etape: "remuneration", libelle: "Jours fériés travaillés", type: "multi", options: FERIES, largeur: "entier" },

  // --- Étape 7 : vos déclarations -------------------------------------------------
  {
    cle: "numero_declarant",
    etape: "envoi",
    libelle: "Votre numéro Pajemploi ou CESU",
    type: "texte",
    aide: "Pajemploi pour la garde d'un enfant de moins de 6 ans, CESU sinon. Pas encore de numéro ? Laissez vide : il sera créé à la première déclaration et figurera sur les bulletins.",
  },
];

export function optionsDe(champ: ChampContrat, c: ContexteChamps): Option[] {
  return typeof champ.options === "function" ? champ.options(c) : (champ.options ?? []);
}

export function aideDe(champ: ChampContrat, c: ContexteChamps): string | undefined {
  return typeof champ.aide === "function" ? champ.aide(c) : champ.aide;
}

export function placeholderDe(champ: ChampContrat, c: ContexteChamps): string | undefined {
  return typeof champ.placeholder === "function" ? champ.placeholder(c) : champ.placeholder;
}

export function champVisible(champ: ChampContrat, v: Valeurs, c: ContexteChamps): boolean {
  if (champ.categories && !(c.categorie && champ.categories.includes(c.categorie))) return false;
  return champ.si ? champ.si(v, c) : true;
}

export function champObligatoire(champ: ChampContrat, v: Valeurs, c: ContexteChamps): boolean {
  if (!champVisible(champ, v, c)) return false;
  return typeof champ.obligatoire === "function" ? champ.obligatoire(c, v) : Boolean(champ.obligatoire);
}

/** Enfants gardés (champ « enfants », enregistré en JSON). */
export interface Enfant {
  prenom: string;
  nom: string;
  naissance: string;
}

export function lireEnfants(valeur: string | undefined): Enfant[] {
  try {
    const l = JSON.parse(valeur || "[]");
    return Array.isArray(l)
      ? l.slice(0, 4).map((e) => ({
          prenom: String(e?.prenom ?? "").slice(0, 60),
          nom: String(e?.nom ?? "").slice(0, 60),
          naissance: /^\d{4}-\d{2}-\d{2}$/.test(String(e?.naissance ?? "")) ? String(e.naissance) : "",
        }))
      : [];
  } catch {
    return [];
  }
}

/** Horaires d'un jour : arrivée, départ (hh:mm), travail effectif et présence responsable (heures). */
export interface HorairesJour {
  a: string;
  d: string;
  e: string;
  r: string;
}

export function lirePlanning(valeur: string | undefined): Record<string, HorairesJour> {
  const sortie: Record<string, HorairesJour> = {};
  if (!valeur) return sortie;
  try {
    const brut = JSON.parse(valeur) as Record<string, Partial<HorairesJour>>;
    for (const { valeur: jour } of JOURS) {
      const j = brut?.[jour];
      if (!j || typeof j !== "object") continue;
      const heure = (x: unknown) => (typeof x === "string" && /^\d{2}:\d{2}$/.test(x) ? x : "");
      const duree = (x: unknown) => (typeof x === "string" && /^\d{1,2}([,.]\d{1,2})?$/.test(x.trim()) ? x.trim() : "");
      const h = { a: heure(j.a), d: heure(j.d), e: duree(j.e), r: duree(j.r) };
      if (h.a || h.d || h.e || h.r) sortie[jour] = h;
    }
  } catch {
    /* illisible : vide */
  }
  return sortie;
}

/** Durée en heures entre deux horaires hh:mm (passage de minuit compris). */
export function dureeEntre(a: string, d: string): number | null {
  if (!a || !d) return null;
  const [ha, ma] = a.split(":").map(Number);
  const [hd, md] = d.split(":").map(Number);
  let min = hd * 60 + md - (ha * 60 + ma);
  if (min <= 0) min += 24 * 60;
  return min / 60;
}

export const JOURS_SEMAINE = JOURS;

function rempli(ch: ChampContrat, valeur: string | undefined): boolean {
  if (ch.type === "enfants") return lireEnfants(valeur).some((e) => e.prenom.trim());
  if (ch.type === "planning") return Object.keys(lirePlanning(valeur)).length > 0;
  return Boolean((valeur ?? "").trim());
}

/** « Motif du CDD » → « motif du CDD » (les sigles restent en capitales). */
function minusculeInitiale(t: string): string {
  return /^[A-ZÀ-Ý]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

/** Champs obligatoires restant à remplir, avec leur étape. */
export function champsManquants(v: Valeurs, c: ContexteChamps): { libelle: string; etape: CleEtape }[] {
  return CHAMPS.filter((ch) => champObligatoire(ch, v, c) && !rempli(ch, v[ch.cle])).map((ch) => ({
    libelle: minusculeInitiale(ch.libelle.replace(/ \?$/, "").replace(/ \(.*\)$/, "")),
    etape: ch.etape,
  }));
}

/**
 * Valeurs à enregistrer : seulement les champs connus et affichés, nettoyés.
 * Les champs rangés dans une colonne sont renvoyés à part. `categorie` et
 * `emploi_repere` (choisis par tuiles et cartes) sont gardés tels quels.
 */
export function nettoyerValeurs(
  brut: Valeurs,
  c: ContexteChamps,
): { config: Valeurs; colonnes: Partial<Record<NonNullable<ChampContrat["colonne"]>, string>> } {
  const config: Valeurs = {};
  const colonnes: Partial<Record<NonNullable<ChampContrat["colonne"]>, string>> = {};
    for (const cle of ["categorie", "emploi_repere", "detail_par_jour"]) {
    const v = String(brut[cle] ?? "").trim().slice(0, 40);
    if (/^[a-z_]*$/.test(v) && v) config[cle] = v;
  }
  for (const ch of CHAMPS) {
    if (!champVisible(ch, brut, c)) continue;
    let val = String(brut[ch.cle] ?? "").trim().slice(0, ch.type === "textarea" ? 2000 : ch.type === "multi" ? 1500 : 200);
    if (ch.type === "choix" && val && !optionsDe(ch, c).some((o) => o.valeur === val)) continue;
    if (ch.type === "oui_non" && val && val !== "oui" && val !== "non") continue;
    if (ch.type === "date" && val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) continue;
    if (ch.type === "heure" && val && !/^\d{2}:\d{2}$/.test(val)) continue;
    if (ch.type === "multi") {
      const permis = new Set(optionsDe(ch, c).map((o) => o.valeur));
      val = val
        .split("|")
        .filter((x) => permis.has(x))
        .join("|");
    }
    if (ch.type === "enfants") {
      const liste = lireEnfants(String(brut[ch.cle] ?? "")).filter((e) => e.prenom.trim() || e.nom.trim());
      val = liste.length ? JSON.stringify(liste) : "";
    }
    if (ch.type === "planning") {
      const planning = lirePlanning(String(brut[ch.cle] ?? ""));
      val = Object.keys(planning).length ? JSON.stringify(planning) : "";
    }
    if (ch.colonne) colonnes[ch.colonne] = val;
    else if (val) config[ch.cle] = val;
  }
  return { config, colonnes };
}

/** Valeur lisible d'un champ (récapitulatif). */
export function valeurLisible(ch: ChampContrat, valeur: string, c: ContexteChamps, formatDate: (iso: string) => string): string {
  if (!valeur) return "";
  if (ch.type === "oui_non") return valeur === "oui" ? "Oui" : "Non";
  if (ch.type === "date") return formatDate(valeur);
  if (ch.type === "heure") return valeur.replace(":", " h ");
  if (ch.type === "multi") return valeur.split("|").join(", ");
  if (ch.type === "enfants")
    return lireEnfants(valeur)
      .map((e) => [e.prenom, e.nom].filter(Boolean).join(" ") + (e.naissance ? ` (${formatDate(e.naissance)})` : ""))
      .join(", ");
  if (ch.type === "planning")
    return Object.entries(lirePlanning(valeur))
      .map(([jour, h]) => {
        const parts = [h.a && h.d ? `${h.a.replace(":", " h ")} – ${h.d.replace(":", " h ")}` : "", h.e ? `${h.e} h de travail effectif` : "", h.r ? `${h.r} h de présence responsable` : ""].filter(Boolean);
        return `${jour} : ${parts.join(", ")}`;
      })
      .join(" ; ");
  if (ch.type === "choix") return optionsDe(ch, c).find((o) => o.valeur === valeur)?.libelle ?? valeur;
  return valeur;
}
