import { clientServeur } from "@/lib/supabase/admin";
import { encaisserEcheances, verifierCommandesEnAttente } from "@/lib/paiement";

/**
 * Traitement quotidien des paiements, lancé chaque matin par Vercel
 * (vercel.json, rubrique « crons ») :
 *  1. vérification auprès de Systempay des paiements restés en attente
 *     (notification manquée) ;
 *  2. encaissement des échéances mensuelles du jour et des nouvelles
 *     tentatives après refus.
 *
 * Protégé par CRON_SECRET : Vercel envoie automatiquement
 * « Authorization: Bearer <CRON_SECRET> ». Sans ce secret, la route refuse.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Accès refusé", { status: 401 });
  }
  const db = clientServeur();
  if (!db) return Response.json({ erreur: "SUPABASE_SECRET_KEY absente" }, { status: 500 });

  try {
    const commandes = await verifierCommandesEnAttente(db);
    const echeances = await encaisserEcheances(db);
    console.log("Traitement quotidien Systempay", { commandes, echeances });
    return Response.json({ commandes, echeances });
  } catch (e) {
    console.error("Traitement quotidien Systempay :", e);
    return Response.json({ erreur: (e as Error).message }, { status: 500 });
  }
}
