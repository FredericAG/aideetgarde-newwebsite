import { clientServeur } from "@/lib/supabase/admin";
import { signatureIpnValide } from "@/lib/systempay";
import { traiterReponseCommande } from "@/lib/paiement";

/**
 * Notification de fin de paiement (IPN) envoyée par Systempay, de serveur
 * à serveur, pour le premier paiement d'un abonnement ou la régularisation
 * d'une échéance. L'adresse est transmise à Systempay à chaque paiement
 * (paramètre ipnTargetUrl) : la règle de notification du Back Office, qui
 * sert encore à l'ancien site, n'a pas à être modifiée.
 *
 * Réponses :
 *  - 200 : notification traitée (ou sans objet pour ce site) ;
 *  - 401 : signature invalide (message falsifié ou mauvais mot de passe) ;
 *  - 500 : erreur passagère de notre côté ; Systempay renverra la
 *    notification (rejeu automatique, s'il est activé) et la vérification
 *    quotidienne la rattrapera de toute façon.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Requête illisible", { status: 400 });
  }
  const krAnswer = String(form.get("kr-answer") ?? "");
  const krHash = String(form.get("kr-hash") ?? "");
  const algo = String(form.get("kr-hash-algorithm") ?? "");

  if (algo !== "sha256_hmac" || !signatureIpnValide(krAnswer, krHash)) {
    console.error("IPN Systempay : signature invalide");
    return new Response("Signature invalide", { status: 401 });
  }

  let answer: Record<string, unknown>;
  try {
    answer = JSON.parse(krAnswer);
  } catch {
    return new Response("Réponse illisible", { status: 400 });
  }

  const db = clientServeur();
  if (!db) return new Response("Base de données non configurée", { status: 500 });

  try {
    const resultat = await traiterReponseCommande(db, answer, "ipn");
    return new Response(`OK ${resultat}`, { status: 200 });
  } catch (e) {
    console.error("IPN Systempay :", e);
    return new Response("Erreur de traitement", { status: 500 });
  }
}
