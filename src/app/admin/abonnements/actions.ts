"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { clientServeur } from "@/lib/supabase/admin";
import { configSystempay } from "@/lib/systempay";
import { encaisserEcheances, verifierCommandesEnAttente } from "@/lib/paiement";

const LIBELLES: Record<string, string> = {
  payee: "échéance(s) payée(s)",
  refusee_retentee: "refus avec nouvel essai programmé",
  impayee: "échéance(s) passée(s) en impayé",
  inconnu: "résultat inconnu (vérifié au prochain passage)",
  deja_traitee: "déjà traitée(s)",
  verification_impossible: "vérification impossible (Systempay injoignable)",
  erreur: "erreur(s)",
  abonnement_cree: "abonnement(s) activé(s) après vérification",
  echeance_reglee: "régularisation(s) enregistrée(s)",
  refusee: "paiement(s) refusé(s)",
  abandonnee: "commande(s) abandonnée(s)",
  sans_transaction: "commande(s) sans paiement pour l'instant",
  a_verifier: "paiement(s) à vérifier",
};

function lire(b: Record<string, number>): string {
  const parties = Object.entries(b).map(([k, n]) => `${n} ${LIBELLES[k] ?? k}`);
  return parties.length ? parties.join(", ") : "rien à traiter";
}

/**
 * Lance à la demande le traitement quotidien (sinon exécuté chaque matin
 * par Vercel) : utile en recette, ou après une panne.
 */
export async function lancerTraitementQuotidien(): Promise<string> {
  await requireAdmin("/admin/abonnements");
  const db = clientServeur();
  if (!db) return "Impossible : la clé SUPABASE_SECRET_KEY n'est pas renseignée dans Vercel.";
  if (!configSystempay()) return "Impossible : les clés Systempay ne sont pas renseignées dans Vercel.";
  try {
    const commandes = await verifierCommandesEnAttente(db);
    const echeances = await encaisserEcheances(db);
    revalidatePath("/admin/abonnements");
    return `Paiements en attente : ${lire(commandes)}. Échéances : ${lire(echeances)}.`;
  } catch (e) {
    return `Erreur : ${(e as Error).message}`;
  }
}
