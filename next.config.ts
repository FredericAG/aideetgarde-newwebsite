import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le service worker (notifications) ne doit jamais être servi depuis un
  // cache : une nouvelle version doit être prise en compte immédiatement.
  async headers() {
    return [
      {
        // En-têtes de sécurité de toutes les pages (audit du 12/11/2026).
        // Volontairement sans liste blanche des scripts (CSP script-src) :
        // le formulaire de paiement Systempay charge ses propres scripts et
        // cadres, et une règle fausse bloquerait les paiements. À ajouter
        // après un essai de paiement réel en mode test.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Le site ne peut pas être affiché dans le cadre d'un autre site.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
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
  // Formulaire de l'Assurance Maladie prérempli par le site (courriers des
  // gestions) : à embarquer avec la route qui le lit.
  outputFileTracingIncludes: {
    "/tableau-de-bord/gestions/[id]/courrier": ["./modeles-pdf/**"],
  },
  // Pas de `staleTimes` : jusqu'au 12/11/2026, le navigateur gardait 30
  // secondes les pages déjà visitées. Le serveur répond en 100 ms environ :
  // le gain ne valait pas le risque d'afficher une information périmée
  // (cas vécu : une gestion terminée qui semblait encore en cours).
};

export default nextConfig;
