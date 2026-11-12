import { clientServeur } from "@/lib/supabase/admin";
import { traitementQuotidien } from "@/lib/traitement-quotidien";

/**
 * Traitement quotidien des paiements, lancé chaque matin par Vercel
 * (vercel.json, rubrique « crons ») :
 *  1. vérification auprès de Systempay des paiements restés en attente
 *     (notification manquée) ;
 *  2. encaissement des échéances mensuelles du jour et des nouvelles
 *     tentatives après refus ;
 *  3. passage en « résilié » des abonnements dont la résiliation demandée
 *     par l'abonné arrive à terme (fin du mois civil).
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

  const bilan = await traitementQuotidien(db, "automatique");
  await db.rpc("anonymiser_clics_partenaires").then(() => null, () => null);
  console.log("Traitement quotidien Systempay", bilan);
  return Response.json(bilan, { status: bilan.ok ? 200 : 500 });
}
