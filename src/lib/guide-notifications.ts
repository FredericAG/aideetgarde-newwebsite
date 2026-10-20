/**
 * Où réautoriser les notifications, selon le navigateur et l'appareil
 * utilisés. La détection lit uniquement l'identifiant du navigateur
 * (« user agent »), dans le navigateur lui-même : rien n'est enregistré ni
 * envoyé au serveur. C'est une simple adaptation de l'affichage au service
 * demandé, sans traceur : pas de consentement à recueillir.
 */
export interface GuideNotifications {
  /** ex. « Chrome sur ordinateur Windows » */
  contexte: string;
  etapes: string[];
  /** Réglage du système à vérifier aussi (facultatif). */
  systeme?: string;
}

export function guideReactivation(): GuideNotifications {
  const ua = navigator.userAgent;
  const installe =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const windows = /windows/i.test(ua);
  const mac = /macintosh|mac os x/i.test(ua) && !ios;

  if (ios) {
    return {
      contexte: installe ? "application Aide & Garde sur iPhone / iPad" : "Safari sur iPhone / iPad",
      etapes: installe
        ? [
            "Ouvrez l'application Réglages de l'iPhone.",
            "Touchez « Notifications », puis « Aide & Garde » dans la liste.",
            "Activez « Autoriser les notifications », ainsi que « Pastilles » pour le chiffre rouge sur l'icône.",
          ]
        : [
            "Sur iPhone, les notifications ne fonctionnent que depuis l'espace installé sur l'écran d'accueil.",
            "Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ».",
            "Ouvrez Aide & Garde depuis cette icône, puis revenez dans « Mon compte » pour activer les notifications.",
          ],
    };
  }

  const samsung = /SamsungBrowser/i.test(ua);
  const edge = /Edg(e|A|iOS)?\//i.test(ua);
  const firefox = /Firefox|FxiOS/i.test(ua);
  const opera = /OPR\//i.test(ua);
  const chrome = !edge && !samsung && !opera && /Chrome|CriOS/i.test(ua);
  const safari = !chrome && !edge && !firefox && !opera && !samsung && /Safari/i.test(ua);

  if (android) {
    if (installe) {
      return {
        contexte: "application Aide & Garde sur Android",
        etapes: [
          "Appuyez longuement sur l'icône Aide & Garde de l'écran d'accueil, puis sur « Infos sur l'appli » (ou ⓘ).",
          "Touchez « Notifications » et activez-les.",
          "Revenez dans l'application, puis dans « Mon compte » si le bouton « Activer » s'affiche.",
        ],
      };
    }
    if (samsung) {
      return {
        contexte: "Samsung Internet sur Android",
        etapes: [
          "Touchez le menu ☰ en bas à droite, puis « Paramètres ».",
          "Touchez « Sites et téléchargements », puis « Notifications ».",
          "Retrouvez le site Aide & Garde et autorisez-le.",
        ],
      };
    }
    if (firefox) {
      return {
        contexte: "Firefox sur Android",
        etapes: [
          "Touchez le cadenas à gauche de l'adresse du site.",
          "Touchez « Notifications » et choisissez « Autorisé ».",
          "Rechargez la page.",
        ],
      };
    }
    return {
      contexte: `${edge ? "Edge" : "Chrome"} sur Android`,
      etapes: [
        "Touchez l'icône à gauche de l'adresse du site (réglages du site).",
        "Touchez « Autorisations », puis « Notifications », et choisissez « Autoriser ».",
        "Rechargez la page.",
      ],
      systeme:
        "Si rien ne change : Paramètres du téléphone → Applications → " +
        `${edge ? "Edge" : "Chrome"} → Notifications, et vérifiez qu'elles sont activées.`,
    };
  }

  const ordinateur = windows ? "ordinateur Windows" : mac ? "Mac" : "ordinateur";
  const systeme = windows
    ? "Vérifiez aussi : Paramètres Windows → Système → Notifications, et que votre navigateur y est activé."
    : mac
      ? "Vérifiez aussi : Réglages Système du Mac → Notifications → votre navigateur → Autoriser les notifications."
      : undefined;

  if (safari) {
    return {
      contexte: `Safari sur ${ordinateur}`,
      etapes: [
        "Menu Safari → Réglages (ou Préférences) → onglet « Sites web ».",
        "Choisissez « Notifications » dans la colonne de gauche.",
        "Pour le site Aide & Garde, choisissez « Autoriser », puis rechargez la page.",
      ],
      systeme,
    };
  }
  if (firefox) {
    return {
      contexte: `Firefox sur ${ordinateur}`,
      etapes: [
        "Cliquez sur l'icône à gauche de l'adresse du site (cadenas ou réglages).",
        "Sous « Autorisations », retirez le blocage des notifications (croix à côté de « Bloqué »).",
        "Rechargez la page, puis cliquez sur « Activer les notifications ».",
      ],
      systeme,
    };
  }
  const nom = edge ? "Edge" : opera ? "Opera" : chrome ? "Chrome" : "votre navigateur";
  return {
    contexte: `${nom} sur ${ordinateur}`,
    etapes: [
      "Cliquez sur l'icône à gauche de l'adresse du site (cadenas ou réglages).",
      edge
        ? "Choisissez « Autorisations pour ce site », puis « Notifications » → « Autoriser »."
        : "Activez « Notifications » (ou choisissez « Autoriser » dans la liste).",
      "Rechargez la page, puis cliquez sur « Activer les notifications ».",
    ],
    systeme,
  };
}
