/**
 * Modèles d'emails de relance envoyés depuis l'administration (brique 9c).
 *
 * Les textes se modifient ici (un modèle = un bouton). Ils restent sobres :
 * jamais de montant, de nom de salarié ni de pièce jointe, comme les autres
 * emails du site. Module sans dépendance serveur : la fenêtre de
 * confirmation de l'administration affiche le même texte que l'email.
 */
export type ModeleRelance =
  | "abonnement_sans_gestion"
  | "brouillon_a_envoyer"
  | "declaration_mois"
  | "inscrit_sans_abonnement"
  | "paiement_refuse";

export interface ContenuRelance {
  /** Texte du bouton dans l'administration. */
  bouton: string;
  /** Quand l'utiliser (aide pour l'administrateur). */
  usage: string;
  sujet: string;
  titre: string;
  paragraphes: string[];
  lien: { texte: string; chemin: string };
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function contenuRelance(modele: ModeleRelance, aujourdhui = new Date()): ContenuRelance {
  const mois = `${MOIS[aujourdhui.getMonth()]} ${aujourdhui.getFullYear()}`;
  switch (modele) {
    case "abonnement_sans_gestion":
      return {
        bouton: "Abonnement sans gestion",
        usage: "Abonnement actif, mais aucune gestion en cours ni en attente.",
        sujet: "Votre abonnement Aide & Garde : aucun salarié suivi pour le moment",
        titre: "Aucun salarié n'est suivi sur votre abonnement",
        paragraphes: [
          "Votre abonnement Aide & Garde est actif, mais aucune gestion de salarié n'est ouverte : nous ne pouvons donc pas établir de bulletin de paie pour vous.",
          "Vous employez un salarié ? Ouvrez sa gestion en quelques minutes depuis votre espace : nous vérifions les informations et nous nous occupons du reste.",
          "Vous n'avez plus de salarié à déclarer ? Répondez simplement à cet email : nous résilions votre abonnement pour que vous ne payiez pas un service dont vous n'avez plus besoin.",
        ],
        lien: { texte: "Créer une gestion", chemin: "/tableau-de-bord/gestions/nouvelle" },
      };
    case "brouillon_a_envoyer":
      return {
        bouton: "Gestion pas encore envoyée",
        usage: "Une gestion est restée à l'état de brouillon.",
        sujet: "Votre gestion n'est pas encore envoyée à Aide & Garde",
        titre: "Une gestion attend d'être envoyée",
        paragraphes: [
          "Vous avez commencé à créer la gestion d'un salarié dans votre espace, mais elle ne nous a pas encore été envoyée.",
          "Complétez les informations manquantes et cliquez sur « Envoyer à Aide & Garde » : nous la validons et préparons les bulletins de paie.",
        ],
        lien: { texte: "Compléter ma gestion", chemin: "/tableau-de-bord" },
      };
    case "declaration_mois":
      return {
        bouton: "Déclaration du mois",
        usage: "Rappel de déclarer les heures du mois.",
        sujet: `Pensez à déclarer le mois de ${mois}`,
        titre: `Déclaration du mois de ${mois}`,
        paragraphes: [
          `Pour que nous puissions établir le bulletin de paie de ${mois}, indiquez-nous les heures travaillées par votre salarié (ou confirmez qu'elles sont conformes au contrat).`,
          "Cela prend quelques secondes depuis votre espace, sur ordinateur comme sur téléphone.",
        ],
        lien: { texte: "Déclarer le mois", chemin: "/tableau-de-bord" },
      };
    case "inscrit_sans_abonnement":
      return {
        bouton: "Inscrit sans abonnement",
        usage: "Compte créé, mais aucun abonnement souscrit.",
        sujet: "Finalisez votre abonnement Aide & Garde",
        titre: "Votre espace est prêt",
        paragraphes: [
          "Vous avez créé votre espace Aide & Garde : merci de votre confiance.",
          "Pour que nous prenions en charge la paie de votre salarié, il reste à choisir votre formule d'abonnement en ligne. Une question avant de vous décider ? Répondez simplement à cet email ou appelez-nous.",
        ],
        lien: { texte: "Choisir ma formule", chemin: "/tableau-de-bord/abonnement" },
      };
    case "paiement_refuse":
      return {
        bouton: "Prélèvement refusé",
        usage: "Échéance refusée ou impayée : inviter à régler avec une carte valide.",
        sujet: "Votre prélèvement Aide & Garde n'a pas pu être effectué",
        titre: "Prélèvement non effectué",
        paragraphes: [
          "Le dernier prélèvement de votre abonnement n'a pas pu être effectué par votre banque (carte expirée, plafond atteint…).",
          "Pour que le suivi de vos salariés continue sans interruption, réglez l'échéance en ligne avec une carte valide : elle sera enregistrée pour les mois suivants.",
        ],
        lien: { texte: "Régler mon abonnement", chemin: "/tableau-de-bord/abonnement" },
      };
  }
}

export const MODELES_RELANCE: ModeleRelance[] = [
  "abonnement_sans_gestion",
  "brouillon_a_envoyer",
  "declaration_mois",
  "inscrit_sans_abonnement",
  "paiement_refuse",
];

export function estModeleRelance(v: string): v is ModeleRelance {
  return (MODELES_RELANCE as string[]).includes(v);
}
