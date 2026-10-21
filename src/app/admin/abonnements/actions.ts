"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { clientServeur } from "@/lib/supabase/admin";
import { appelSystempay, configSystempay } from "@/lib/systempay";
import { adresseSite } from "@/lib/email";
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
    const { data: resiliations } = await db.rpc("appliquer_resiliations");
    revalidatePath("/admin/abonnements");
    return `Paiements en attente : ${lire(commandes)}. Échéances : ${lire(echeances)}.${
      resiliations ? ` Résiliations appliquées : ${resiliations}.` : ""
    }`;
  } catch (e) {
    return `Erreur : ${(e as Error).message}`;
  }
}

export interface PointControle {
  libelle: string;
  ok: boolean;
  detail: string;
}

/**
 * Contrôle de la configuration du paiement, sans rien débiter : clé
 * secrète Supabase, identifiants Systempay (appel du service de test
 * Charge/SDKTest), clé publique, secret de la tâche quotidienne, adresse de
 * notification. Aucune valeur secrète n'est affichée.
 */
export async function verifierConfiguration(): Promise<PointControle[]> {
  await requireAdmin("/admin/abonnements");
  const points: PointControle[] = [];

  // 1. Clé secrète Supabase
  const cleSupabase = process.env.SUPABASE_SECRET_KEY ?? "";
  const db = clientServeur();
  if (!db) {
    points.push({ libelle: "Clé secrète Supabase", ok: false, detail: "SUPABASE_SECRET_KEY absente dans Vercel (ou déploiement antérieur à son ajout : redéployer)." });
  } else {
    const { error } = await db.from("commandes").select("id", { count: "exact", head: true });
    points.push({
      libelle: "Clé secrète Supabase",
      ok: !error,
      detail: error
        ? `Refusée par Supabase : ${error.message}. Vérifier que la valeur copiée est complète (bouton de copie, pas le texte masqué).`
        : `Acceptée (clé ${cleSupabase.startsWith("sb_secret_") ? "« sb_secret_… »" : "ancienne génération"}), tables de paiement accessibles.`,
    });
  }

  // 2. Identifiants Systempay
  const config = configSystempay();
  if (!config) {
    points.push({ libelle: "Identifiants Systempay", ok: false, detail: "SYSTEMPAY_BOUTIQUE, SYSTEMPAY_MOT_DE_PASSE ou NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE absent." });
  } else {
    const formatBoutique = /^\d{8}$/.test(config.boutique);
    const res = await appelSystempay("Charge/SDKTest", { value: "aideetgarde" }, 10000);
    points.push({
      libelle: "Identifiants Systempay",
      ok: res.ok && formatBoutique,
      detail: res.ok
        ? `Acceptés par Systempay, boutique ${config.boutique}, mode ${config.mode}.`
        : `Refusés : ${res.erreur}${formatBoutique ? "" : " — l'identifiant de boutique doit compter 8 chiffres"}. Vérifier SYSTEMPAY_BOUTIQUE et SYSTEMPAY_MOT_DE_PASSE (sans espace ni guillemet).`,
    });
    const attendu = `${config.boutique}:${config.mode === "TEST" ? "testpublickey_" : "publickey_"}`;
    points.push({
      libelle: "Clé publique du formulaire",
      ok: config.clePublique.startsWith(attendu),
      detail: config.clePublique.startsWith(attendu)
        ? "Format correct (identifiant de la boutique, puis la clé)."
        : `Doit commencer par « ${attendu} ». Vérifier NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE, puis redéployer.`,
    });
  }

  // 3. Tâche quotidienne
  const cron = process.env.CRON_SECRET ?? "";
  points.push({
    libelle: "Secret de la tâche quotidienne",
    ok: cron.length >= 32,
    detail: cron.length >= 32 ? "Présent." : cron ? "Trop court (32 caractères au moins)." : "CRON_SECRET absent : les prélèvements du matin ne se feraient pas.",
  });

  // 4. Adresse de notification
  const site = await adresseSite();
  const apercu = /-git-|-[a-z0-9]{9}-/.test(site);
  points.push({
    libelle: "Adresse de notification (IPN)",
    ok: !apercu,
    detail: apercu
      ? `${site}/api/systempay/ipn : adresse de prévisualisation, protégée par Vercel ; faire la recette sur l'adresse principale.`
      : `${site}/api/systempay/ipn`,
  });

  // 5. Emails
  points.push({
    libelle: "Envoi des emails (Brevo)",
    ok: Boolean(process.env.BREVO_API_KEY),
    detail: process.env.BREVO_API_KEY ? "Clé présente." : "BREVO_API_KEY absente : aucun email ne partirait.",
  });
  return points;
}
