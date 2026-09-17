import localFont from "next/font/local";

/**
 * Corporative — police de texte courant de la charte graphique Aide & Garde (2018).
 * Utilisée pour le corps de texte (Regular, 12pt) et les intertitres H3 (Bold, 20pt).
 */
export const corporative = localFont({
  src: [
    { path: "./Corporative-Regular.otf", weight: "400", style: "normal" },
    { path: "./Corporative-Italic.otf", weight: "400", style: "italic" },
    { path: "./Corporative-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-corporative",
  display: "swap",
});

/**
 * Stevie Sans — police de titre de la charte graphique Aide & Garde (2018).
 * La charte ne prescrit que le poids Black pour les H1 (capitales, 24pt), mais
 * la famille complète est fournie : on l'expose entièrement pour permettre
 * d'autres usages (badges, accents) sans devoir la réimporter plus tard.
 */
export const stevieSans = localFont({
  src: [
    { path: "./StevieSans-Thin.otf", weight: "100", style: "normal" },
    { path: "./StevieSans-Light.otf", weight: "300", style: "normal" },
    { path: "./StevieSans-Book.otf", weight: "350", style: "normal" },
    { path: "./StevieSans-Regular.otf", weight: "400", style: "normal" },
    { path: "./StevieSans-Medium.otf", weight: "500", style: "normal" },
    { path: "./StevieSans-Bold.otf", weight: "700", style: "normal" },
    { path: "./StevieSans-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-stevie-sans",
  display: "swap",
});
