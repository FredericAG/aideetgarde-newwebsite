import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le service worker (notifications) ne doit jamais être servi depuis un
  // cache : une nouvelle version doit être prise en compte immédiatement.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
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
