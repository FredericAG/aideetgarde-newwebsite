import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Le navigateur garde en mémoire, pendant 30 secondes, les pages déjà
    // visitées : revenir sur une page vue il y a quelques instants
    // (tableau de bord → gestion → tableau de bord) est alors instantané,
    // sans nouvel aller-retour au serveur. Toute action (dépôt, suppression,
    // modification) vide ce cache : on ne voit jamais un résultat périmé
    // après avoir soi-même modifié quelque chose. Valeur par défaut : 0.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
