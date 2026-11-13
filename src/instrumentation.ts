import type { Instrumentation } from "next";

/**
 * Erreurs du serveur (pages, actions, routes) : alerte par e-mail à Aide &
 * Garde (décision du 13/11/2026). Voir src/lib/alerte-erreur.ts.
 */
export const onRequestError: Instrumentation.onRequestError = async (erreur, requete, contexte) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const e = erreur as { message?: string; digest?: string };
  // Redirections et pages introuvables : pas des erreurs.
  if (e.digest?.startsWith("NEXT_REDIRECT") || e.digest?.startsWith("NEXT_HTTP_ERROR_FALLBACK") || e.digest === "NEXT_NOT_FOUND") return;
  const { signalerErreur } = await import("@/lib/alerte-erreur");
  await signalerErreur({
    origine: "serveur",
    chemin: requete.path,
    message: e.message ?? String(erreur),
    reference: e.digest,
    detail: `${contexte.routeType} ${contexte.routePath} (${requete.method})`,
  });
};
