import { signalerErreur } from "@/lib/alerte-erreur";

/**
 * Erreur survenue dans le navigateur d'un utilisateur (page d'erreur du
 * site) : transmise pour l'alerte par e-mail. Les erreurs du serveur sont
 * signalées directement (src/instrumentation.ts).
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const corps = JSON.parse((await request.text()).slice(0, 2000)) as { chemin?: unknown; message?: unknown };
    const chemin = typeof corps.chemin === "string" && corps.chemin.startsWith("/") ? corps.chemin : "/";
    const message = typeof corps.message === "string" ? corps.message : "";
    if (message) await signalerErreur({ origine: "navigateur", chemin, message });
  } catch {
    // Corps illisible : ignoré.
  }
  return new Response(null, { status: 204 });
}
