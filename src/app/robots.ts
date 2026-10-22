import type { MetadataRoute } from "next";

/**
 * robots.txt — consignes aux robots des moteurs de recherche et des IA.
 *
 * Tant que le site est en test (adresse provisoire *.vercel.app), on
 * interdit TOUT référencement : un site de test indexé ferait concurrence au
 * vrai site et pourrait afficher des pages inachevées dans Google.
 * L'indexation s'ouvrira en renseignant NEXT_PUBLIC_INDEXATION=oui dans
 * Vercel, uniquement sur le domaine définitif.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_INDEXATION !== "oui") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Les espaces privés n'ont rien à faire dans un moteur de recherche.
        disallow: ["/admin", "/tableau-de-bord", "/mon-compte", "/documents", "/auth", "/recommander"],
      },
    ],
  };
}
