/**
 * Installation de l'espace Aide & Garde sur l'écran d'accueil d'un
 * téléphone (application web). La détection lit seulement l'identifiant du
 * navigateur, dans le navigateur lui-même : rien n'est enregistré ni envoyé.
 *
 * Textes pensés pour une personne peu habituée au téléphone (test du 25/10
 * avec un utilisateur de plus de 70 ans) : une action par étape, le nom
 * exact du bouton à toucher, et où il se trouve sur l'écran.
 */

export type Appareil = "iphone" | "samsung" | "android" | "android-firefox" | "ordinateur";

export interface EtapeInstallation {
  texte: string;
  /** Pictogramme du bouton à toucher (dessiné par GuideInstallation). */
  icone?: "partage" | "trois-points" | "menu-samsung" | "plus" | "aucun";
}

export interface GuideInstallation {
  appareil: Appareil;
  titre: string;
  etapes: EtapeInstallation[];
  /** Conseil si l'option n'apparaît pas. */
  sinon?: string;
}

export function estInstallee(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function detecterAppareil(): Appareil {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "iphone";
  if (/android/i.test(ua)) {
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    if (/Firefox/i.test(ua)) return "android-firefox";
    return "android";
  }
  return "ordinateur";
}

export const GUIDES: Record<Appareil, GuideInstallation> = {
  iphone: {
    appareil: "iphone",
    titre: "Sur iPhone ou iPad (Safari)",
    etapes: [
      { texte: "Ouvrez cette page dans Safari, le navigateur à la boussole bleue.", icone: "aucun" },
      {
        texte:
          "Touchez le bouton Partager\u00a0: un carré avec une flèche vers le haut, en bas de l'écran. S'il n'apparaît pas, touchez d'abord les trois points «\u00a0⋯\u00a0» en bas à droite.",
        icone: "partage",
      },
      {
        texte: "Faites glisser la liste vers le haut et touchez «\u00a0Sur l'écran d'accueil\u00a0».",
        icone: "plus",
      },
      { texte: "Touchez «\u00a0Ajouter\u00a0», en haut à droite.", icone: "aucun" },
      {
        texte: "L'icône Aide & Garde apparaît sur l'écran d'accueil\u00a0: c'est elle qu'il faut toucher désormais.",
        icone: "aucun",
      },
    ],
    sinon: "Sur iPhone, l'installation ne se fait que depuis Safari (ou Chrome, avec le même bouton Partager).",
  },
  samsung: {
    appareil: "samsung",
    titre: "Sur téléphone Samsung (navigateur Samsung Internet)",
    etapes: [
      {
        texte: "Touchez le bouton Menu\u00a0: trois traits horizontaux «\u00a0≡\u00a0», en bas à droite de l'écran.",
        icone: "menu-samsung",
      },
      {
        texte: "Touchez «\u00a0Ajouter la page à\u00a0» (ou «\u00a0Ajouter à\u00a0»).",
        icone: "plus",
      },
      { texte: "Touchez «\u00a0Écran d'accueil\u00a0», puis «\u00a0Ajouter\u00a0».", icone: "aucun" },
      {
        texte: "L'icône Aide & Garde apparaît sur l'écran d'accueil\u00a0: c'est elle qu'il faut toucher désormais.",
        icone: "aucun",
      },
    ],
    sinon:
      "Une petite icône d'installation (flèche vers le bas ou «\u00a0+\u00a0») peut aussi apparaître dans la barre d'adresse, en haut\u00a0: la toucher fait la même chose.",
  },
  android: {
    appareil: "android",
    titre: "Sur téléphone Android (Chrome)",
    etapes: [
      {
        texte: "Touchez les trois points «\u00a0⋮\u00a0», en haut à droite de l'écran.",
        icone: "trois-points",
      },
      {
        texte: "Touchez «\u00a0Ajouter à l'écran d'accueil\u00a0» (ou «\u00a0Installer l'application\u00a0»).",
        icone: "plus",
      },
      { texte: "Touchez «\u00a0Installer\u00a0» pour confirmer.", icone: "aucun" },
      {
        texte: "L'icône Aide & Garde apparaît sur l'écran d'accueil\u00a0: c'est elle qu'il faut toucher désormais.",
        icone: "aucun",
      },
    ],
    sinon: "Si le téléphone propose de placer l'icône lui-même, choisissez «\u00a0Ajouter automatiquement\u00a0».",
  },
  "android-firefox": {
    appareil: "android-firefox",
    titre: "Sur téléphone Android (Firefox)",
    etapes: [
      { texte: "Touchez les trois points «\u00a0⋮\u00a0» (en haut ou en bas à droite).", icone: "trois-points" },
      { texte: "Touchez «\u00a0Installer\u00a0» ou «\u00a0Ajouter à l'écran d'accueil\u00a0».", icone: "plus" },
      { texte: "Confirmez avec «\u00a0Ajouter\u00a0».", icone: "aucun" },
    ],
  },
  ordinateur: {
    appareil: "ordinateur",
    titre: "Sur ordinateur",
    etapes: [
      {
        texte:
          "Pas besoin d'installer\u00a0: ajoutez simplement la page à vos favoris (étoile à droite de l'adresse), ou ouvrez aideetgarde.fr.",
        icone: "aucun",
      },
      {
        texte:
          "Avec Chrome ou Edge, vous pouvez aussi cliquer sur l'icône d'installation à droite de l'adresse (un écran avec une flèche).",
        icone: "aucun",
      },
    ],
  },
};

/**
 * Invite d'installation « native » d'Android (Chrome, Edge) : le navigateur
 * la propose une seule fois par chargement de page. On la garde de côté
 * pour l'afficher au moment où l'abonné touche notre bouton « Installer ».
 */
export interface InviteInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
