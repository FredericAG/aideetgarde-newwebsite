import localFont from "next/font/local";

/**
 * Corporative — police de texte courant de la charte graphique Aide & Garde (2018).
 * Utilisée pour le corps de texte (Regular, 12pt) et les intertitres H3 (Bold, 20pt).
 */
export const corporative = localFont({
  src: [
    { path: "./Corporative-Regular.otf", weight: "400", style: "normal" },
    { path: "./Corporative-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-corporative",
  display: "swap",
});

/**
 * Stevie Sans — police de titre de la charte graphique Aide & Garde (2018).
 * La charte ne prescrit que le poids Black pour les H1 (capitales, 24pt).
 *
 * Seules les graisses réellement utilisées sont déclarées (audit du
 * 12/11/2026) : chaque fichier déclaré ici est téléchargé par tous les
 * visiteurs, sur toutes les pages. Les dix fichiers pesaient 554 Ko ; il en
 * reste quatre. Les autres graisses restent dans ce dossier : pour en
 * utiliser une, la redéclarer ici.
 */
export const stevieSans = localFont({
  src: [
    { path: "./StevieSans-Bold.otf", weight: "700", style: "normal" },
    { path: "./StevieSans-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-stevie-sans",
  display: "swap",
});
