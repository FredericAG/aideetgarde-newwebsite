import type { MetadataRoute } from "next";

/**
 * Manifeste d'application web (PWA, décision 1) : permet d'installer le
 * site sur l'écran d'accueil d'un téléphone (« Ajouter à l'écran
 * d'accueil »). Il s'ouvre alors en plein écran, comme une application,
 * directement sur le tableau de bord. C'est le même site : mêmes comptes,
 * mêmes données, en temps réel, sur ordinateur comme sur téléphone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aide & Garde — Espace employeur",
    short_name: "Aide & Garde",
    description:
      "Votre espace employeur Aide & Garde : bulletins, documents et déclarations du mois.",
    lang: "fr",
    start_url: "/tableau-de-bord",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#376873",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
