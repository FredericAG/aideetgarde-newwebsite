/**
 * Courriers préremplis proposés dans chaque gestion (demande du 24/10/2026,
 * d'après les modèles Word et PDF d'Aide & Garde). Ce fichier décrit les
 * modèles et le petit formulaire de chacun ; il est lu par le navigateur
 * (formulaire) et par le serveur (génération du PDF, voir generer.ts).
 *
 * Pour modifier le TEXTE d'un courrier : src/lib/courriers/generer.ts.
 * Pour ajouter un modèle : une entrée ici, une fonction dans generer.ts.
 */
import type { Civilite, TypeGestion } from "@/lib/data";
import { posteDeLaGestion } from "@/lib/contrat/classification";

export type CleCourrier =
  | "attestation_emploi"
  | "convocation_entretien"
  | "notification_licenciement"
  | "inaptitude_reclassement"
  | "demission"
  | "retraite"
  | "autorisation_parentale"
  | "avance_salaire"
  | "atthon_maladie"
  | "atthon_accident"
  | "declaration_accident"
  | "autorisation_travail";

/** Données connues, transmises au formulaire et au générateur. */
export interface ContexteCourrier {
  employeur: {
    civilite: Civilite;
    prenom: string;
    nom: string;
    adresse: string;
    code_postal: string;
    ville: string;
    telephone: string;
    /** AAAA-MM-JJ, ou vide (profil non complété). */
    date_naissance: string;
  };
  salarie: {
    civilite: Civilite;
    prenom: string;
    nom: string;
    adresse: string;
    code_postal: string;
    ville: string;
  };
  gestion: {
    reference: string;
    type_gestion: TypeGestion;
    type_contrat: "CDI" | "CDD" | null;
    date_debut: string;
    heures: number | null;
    unite_heures: "semaine" | "mois" | null;
    date_fin_prevue: string | null;
    remplacement: boolean;
  };
  /** Champs complémentaires du contrat (src/lib/contrat/champs.ts). */
  details: Record<string, string>;
}

export interface ChampCourrier {
  nom: string;
  libelle: string;
  type: "date" | "time" | "text" | "textarea" | "montant" | "select" | "case";
  aide?: string;
  placeholder?: string;
  options?: { valeur: string; libelle: string }[];
  /** Valeur proposée d'office. */
  defaut?: (c: ContexteCourrier) => string;
  /**
   * Repris des informations de la gestion : une fois connu, le champ est
   * rangé dans « Déjà renseigné » plutôt que redemandé (demande du 25/10).
   */
  connu?: boolean;
  /** Champ affiché seulement si un autre champ a cette valeur. */
  si?: { champ: string; valeur: string };
  /**
   * Liste « Modèle de texte » : choisir une option remplace le contenu de ce
   * champ texte par le texte proposé (modifiable ensuite).
   */
  remplit?: { champ: string; textes: (c: ContexteCourrier) => Record<string, string> };
}

export interface ModeleCourrier {
  cle: CleCourrier;
  titre: string;
  /** Une ligne sous le titre. */
  description: string;
  /** Qui signe le courrier. */
  auteur: "employeur" | "salarie" | "parent";
  /** Mise en garde affichée avant le formulaire. */
  avertissement?: string;
  /** L'adresse du salarié figure sur le courrier. */
  adresseSalarie: boolean;
  champs: ChampCourrier[];
  /** Le modèle ne concerne que certains emplois. */
  emplois?: TypeGestion[];
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Emploi tel qu'il s'écrit dans une phrase (« en qualité de … »). */
export function emploiEnToutesLettres(c: Pick<ContexteCourrier, "gestion" | "salarie" | "details">): string {
  switch (c.gestion.type_gestion) {
    case "garde_enfants":
      return "garde d'enfants";
    case "aide_domicile":
      return "aide à domicile";
    case "employe_maison":
      return c.salarie.civilite === "Madame" ? "employée de maison" : "employé de maison";
    case "environnement_technique": {
      const f = c.salarie.civilite === "Madame";
      const cle = c.details.emploi_repere ?? "";
      if (cle.startsWith("enseignant")) return f ? "enseignante particulière" : "enseignant particulier";
      if (cle.startsWith("informatique")) return f ? "assistante informatique" : "assistant informatique";
      return f ? "secrétaire particulière" : "secrétaire particulier";
    }
    case "environnement_externe": {
      const f = c.salarie.civilite === "Madame";
      if ((c.details.emploi_repere ?? "").startsWith("gardien")) return f ? "gardienne" : "gardien";
      return f ? "employée d'entretien et de petits travaux" : "employé d'entretien et de petits travaux";
    }
  }
}

/** « d'aide à domicile », « de gardien » (élision devant une voyelle). */
export function deEmploi(c: Pick<ContexteCourrier, "gestion" | "salarie" | "details">): string {
  const emploi = emploiEnToutesLettres(c);
  return /^[aeéèêiîoôuh]/i.test(emploi) ? `d'${emploi}` : `de ${emploi}`;
}

/** « en qualité d'aide à domicile », « en qualité de gardien ». */
export function enQualiteDe(c: Pick<ContexteCourrier, "gestion" | "salarie" | "details">): string {
  return `en qualité ${deEmploi(c)}`;
}

/** Textes de motif proposés pour la lettre de licenciement. */
function motifsLicenciement(c: ContexteCourrier): Record<string, string> {
  return {
    changement_garde:
      "Mon organisation familiale évolue (entrée de mes enfants à l'école, nouveaux horaires, autre solution de garde…) : j'ai décidé de changer le mode de garde de mes enfants, ce qui entraîne la suppression du poste de garde d'enfants que vous occupez.\n\nCette décision ne remet aucunement en cause la qualité de votre travail.",
    suppression_poste: `Mes besoins ont changé et je ne suis plus en mesure de maintenir le poste ${deEmploi(c)} que vous occupez, qui est donc supprimé.\n\nCette décision ne remet aucunement en cause la qualité de votre travail.`,
    refus_modification:
      "Je vous ai proposé une modification de votre contrat de travail (nouveaux horaires, nouvelle durée de travail…), nécessaire à l'organisation de mon foyer. Vous l'avez refusée, ce qui ne me permet pas de poursuivre notre collaboration dans les conditions actuelles.",
    libre: "",
  };
}

export const MODELES_COURRIER: Record<CleCourrier, ModeleCourrier> = {
  attestation_emploi: {
    cle: "attestation_emploi",
    titre: "Attestation d'emploi",
    description: "Certifie que vous employez votre salarié, depuis quand et à quel poste (banque, logement, CAF…).",
    auteur: "employeur",
    adresseSalarie: true,
    champs: [
      {
        nom: "avec_horaires",
        libelle: "Indiquer la durée de travail prévue au contrat",
        type: "case",
      },
    ],
  },
  convocation_entretien: {
    cle: "convocation_entretien",
    titre: "Convocation à l'entretien préalable",
    description: "Première étape obligatoire d'un licenciement.",
    auteur: "employeur",
    adresseSalarie: true,
    champs: [
      {
        nom: "date_entretien",
        libelle: "Date de l'entretien",
        type: "date",
        aide: "Au plus tôt le 5e jour ouvrable après la remise de la lettre ou sa première présentation par la poste (hors dimanches et jours fériés).",
      },
      { nom: "heure_entretien", libelle: "Heure", type: "time" },
      {
        nom: "lieu",
        libelle: "Lieu",
        type: "text",
        defaut: () => "à mon domicile",
      },
    ],
  },
  notification_licenciement: {
    cle: "notification_licenciement",
    titre: "Lettre de licenciement",
    description: "À envoyer en recommandé, au plus tôt le 5e jour ouvrable après l'entretien.",
    auteur: "employeur",
    adresseSalarie: true,
    avertissement:
      "Le motif doit être précis, réel et vérifiable, et reprendre ce que vous avez exposé lors de l'entretien. Adaptez le texte proposé à votre situation. En cas de faute grave, appelez-nous avant d'envoyer la lettre.",
    champs: [
      { nom: "date_entretien", libelle: "Date de l'entretien préalable", type: "date" },
      {
        nom: "modele_motif",
        libelle: "Motif",
        type: "select",
        options: [
          { valeur: "", libelle: "Choisir un texte de départ…" },
          { valeur: "changement_garde", libelle: "Changement de mode de garde" },
          { valeur: "suppression_poste", libelle: "Suppression du poste (fin du besoin)" },
          { valeur: "refus_modification", libelle: "Refus d'une modification du contrat" },
          { valeur: "libre", libelle: "Autre motif (texte libre)" },
        ],
        remplit: { champ: "motif", textes: motifsLicenciement },
      },
      {
        nom: "motif",
        libelle: "Texte du motif",
        type: "textarea",
        placeholder: "Décrivez les faits, avec les dates",
      },
      {
        nom: "dispense_preavis",
        libelle: "Je dispense mon salarié d'effectuer son préavis (il reste payé)",
        type: "case",
      },
    ],
  },
  inaptitude_reclassement: {
    cle: "inaptitude_reclassement",
    titre: "Impossibilité de reclassement (inaptitude)",
    description: "Après un avis d'inaptitude du médecin du travail, avant d'engager le licenciement.",
    auteur: "employeur",
    adresseSalarie: true,
    champs: [
      { nom: "date_avis", libelle: "Date de l'avis d'inaptitude", type: "date" },
      {
        nom: "postes",
        libelle: "Postes recherchés (un par ligne, facultatif)",
        type: "textarea",
      },
      {
        nom: "amenagements",
        libelle: "Aménagements envisagés (un par ligne, facultatif)",
        type: "textarea",
      },
      {
        nom: "raison",
        libelle: "Pourquoi le reclassement est impossible",
        type: "select",
        options: [
          { valeur: "aucun_emploi", libelle: "Aucun emploi disponible adapté à son état de santé" },
          { valeur: "refus_medecin", libelle: "Le médecin du travail n'a pas validé le poste identifié" },
          { valeur: "refus_salarie", libelle: "Le salarié a refusé la proposition de reclassement" },
        ],
      },
      {
        nom: "motif_medecin",
        libelle: "Motif donné par le médecin du travail",
        type: "text",
        si: { champ: "raison", valeur: "refus_medecin" },
      },
    ],
  },
  demission: {
    cle: "demission",
    titre: "Lettre de démission (modèle pour le salarié)",
    description: "Préremplie au nom de votre salarié, à lui remettre s'il souhaite démissionner.",
    auteur: "salarie",
    adresseSalarie: true,
    avertissement:
      "La démission doit venir de votre salarié, librement et clairement : ne lui remettez ce modèle que s'il vous le demande. Une démission imposée peut être requalifiée en licenciement.",
    champs: [
      {
        nom: "dispense_demandee",
        libelle: "Le salarié demande à ne pas effectuer son préavis",
        type: "case",
      },
    ],
  },
  retraite: {
    cle: "retraite",
    titre: "Départ volontaire à la retraite (modèle pour le salarié)",
    description: "Préremplie au nom de votre salarié, à lui remettre s'il part à la retraite.",
    auteur: "salarie",
    adresseSalarie: true,
    avertissement:
      "Le départ à la retraite doit venir de votre salarié : ne lui remettez ce modèle que s'il vous le demande.",
    champs: [{ nom: "date_depart", libelle: "Date de départ (fin du préavis)", type: "date" }],
  },
  autorisation_parentale: {
    cle: "autorisation_parentale",
    titre: "Autorisation parentale (salarié mineur)",
    description: "À faire signer par un parent si votre salarié a moins de 18 ans.",
    auteur: "parent",
    adresseSalarie: false,
    champs: [
      { nom: "parent", libelle: "Prénom et nom du parent", type: "text" },
      { nom: "date_naissance", connu: true, libelle: "Date de naissance du salarié", type: "date", defaut: (c) => c.details.date_naissance ?? "" },
      { nom: "du", libelle: "Emploi du", type: "date", defaut: (c) => c.gestion.date_debut },
      { nom: "au", libelle: "au (facultatif)", type: "date" },
    ],
  },
  avance_salaire: {
    cle: "avance_salaire",
    titre: "Avance sur salaire",
    description: "Engagement de remboursement à signer par vous et votre salarié.",
    auteur: "employeur",
    adresseSalarie: false,
    avertissement:
      "Chaque retenue sur salaire ne peut pas dépasser 1/10e du salaire net. Indiquez-la dans votre déclaration du mois : elle figurera sur le bulletin.",
    champs: [
      { nom: "montant", libelle: "Montant de l'avance (€)", type: "montant" },
      { nom: "debut_remboursement", libelle: "Remboursement à partir du", type: "date" },
      { nom: "retenue", libelle: "Retenue à chaque paie (€)", type: "montant" },
    ],
  },
  atthon_maladie: {
    cle: "atthon_maladie",
    titre: "Attestation sur l'honneur (indemnités journalières)",
    description: "Formulaire de l'Assurance Maladie, prérempli, à remettre à votre salarié : il le complète, le signe et l'envoie à sa CPAM.",
    auteur: "salarie",
    adresseSalarie: false,
    champs: [
      { nom: "debut_arret", libelle: "Premier jour d'arrêt", type: "date" },
      { nom: "dernier_jour", libelle: "Dernier jour travaillé", type: "date" },
      { nom: "maintien", libelle: "Je maintiens le salaire pendant l'arrêt", type: "case" },
    ],
  },
  atthon_accident: {
    cle: "atthon_accident",
    titre: "Attestation sur l'honneur (indemnités journalières)",
    description: "Formulaire de l'Assurance Maladie, prérempli pour un accident du travail, à remettre à votre salarié.",
    auteur: "salarie",
    adresseSalarie: false,
    champs: [
      { nom: "debut_arret", libelle: "Premier jour d'arrêt", type: "date" },
      { nom: "dernier_jour", libelle: "Dernier jour travaillé", type: "date" },
      { nom: "maintien", libelle: "Je maintiens le salaire pendant l'arrêt", type: "case" },
    ],
  },
  declaration_accident: {
    cle: "declaration_accident",
    titre: "Déclaration d'accident du travail (cerfa 14463*03)",
    description:
      "Formulaire officiel prérempli avec vos coordonnées et celles du salarié. Imprimez la 1re page en 4 exemplaires : 3 pour la CPAM, 1 à conserver.",
    auteur: "employeur",
    adresseSalarie: true,
    champs: [
      { nom: "date_accident", libelle: "Date de l'accident", type: "date" },
      { nom: "heure_accident", libelle: "Heure", type: "time" },
      {
        nom: "lieu_type",
        libelle: "Où a eu lieu l'accident ?",
        type: "select",
        options: [
          { valeur: "habituel", libelle: "Sur le lieu de travail habituel" },
          { valeur: "occasionnel", libelle: "Sur un lieu de travail occasionnel" },
          { valeur: "deplacement", libelle: "Au cours d'un déplacement pour l'employeur" },
        ],
      },
      {
        nom: "lieu_accident",
        libelle: "Lieu précis",
        type: "text",
        defaut: (c) =>
          [c.employeur.adresse, [c.employeur.code_postal, c.employeur.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      },
      {
        nom: "activite",
        libelle: "Ce que faisait le salarié",
        type: "textarea",
        placeholder: "ex. il descendait l'escalier en portant l'enfant",
      },
      { nom: "nature", libelle: "Ce qui s'est passé", type: "textarea", placeholder: "ex. chute dans l'escalier" },
      { nom: "siege_lesions", libelle: "Partie du corps touchée", type: "text", placeholder: "ex. cheville gauche" },
      { nom: "nature_lesions", libelle: "Nature de la blessure", type: "text", placeholder: "ex. entorse" },
      {
        nom: "consequences",
        libelle: "Conséquences",
        type: "select",
        options: [
          { valeur: "", libelle: "Je ne sais pas encore" },
          { valeur: "sans", libelle: "Sans arrêt de travail" },
          { valeur: "avec", libelle: "Avec arrêt de travail" },
        ],
      },
    ],
  },
  autorisation_travail: {
    cle: "autorisation_travail",
    titre: "Demande d'autorisation de travail (cerfa 15186*03)",
    description:
      "Pour un salarié étranger qui demande sa régularisation par le travail : la partie employeur, à joindre à son dossier en préfecture.",
    auteur: "employeur",
    adresseSalarie: true,
    avertissement:
      "À remplir sur papier de préférence : le service en ligne reconnaît rarement les numéros Pajemploi et CESU. La partie « taxe employeur » ne vous concerne pas en tant que particulier : laissez-la vide.",
    champs: [
      {
        nom: "numero_declarant",
        connu: true,
        libelle: "Votre numéro Pajemploi ou CESU",
        type: "text",
        aide: "Il remplace le numéro SIRET / URSSAF demandé par le formulaire.",
        defaut: (c) => c.details.numero_declarant ?? "",
      },
      { nom: "date_naissance", connu: true, libelle: "Date de naissance du salarié", type: "date", defaut: (c) => c.details.date_naissance ?? "" },
      {
        nom: "nationalite",
        connu: true,
        libelle: "Nationalité du salarié",
        type: "text",
        defaut: (c) => c.details.nationalite_pays ?? "",
      },
      {
        nom: "emploi",
        connu: true,
        libelle: "Emploi occupé",
        type: "text",
        defaut: (c) => posteDeLaGestion(c.gestion.type_gestion, c.details).emploi,
      },
      { nom: "niveau", connu: true, libelle: "Niveau (convention collective)", type: "text", defaut: (c) => posteDeLaGestion(c.gestion.type_gestion, c.details).niveau },
      { nom: "rome", connu: true, libelle: "Code ROME", type: "text", defaut: (c) => posteDeLaGestion(c.gestion.type_gestion, c.details).rome },
      {
        nom: "salaire_brut",
        libelle: "Salaire horaire brut (€)",
        type: "montant",
        aide: "Il figure sur le bulletin de salaire (avant cotisations).",
      },
    ],
  },
};

/** Champs communs : date et lieu de signature. */
export const CHAMPS_SIGNATURE: ChampCourrier[] = [
  { nom: "fait_le", libelle: "Date du courrier", type: "date", defaut: aujourdhui },
  { nom: "fait_a", libelle: "Fait à", type: "text", defaut: (c) => c.employeur.ville },
];

/** Les modèles ATTHON n'ont pas de date ni de lieu de signature à saisir. */
export function champsDuModele(m: ModeleCourrier): ChampCourrier[] {
  return m.cle.startsWith("atthon") ? m.champs : [...m.champs, ...CHAMPS_SIGNATURE];
}

/** Formulaires officiels (pas de mise en page de lettre). */
export function estFormulaireOfficiel(cle: CleCourrier): boolean {
  return cle.startsWith("atthon") || cle === "declaration_accident" || cle === "autorisation_travail";
}

export function estCleCourrier(v: string): v is CleCourrier {
  return Object.prototype.hasOwnProperty.call(MODELES_COURRIER, v);
}
