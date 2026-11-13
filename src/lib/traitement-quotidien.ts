import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adresseSite, emailAdmin, envoyerEmail, modeleEmail } from "@/lib/email";
import { accorderParrainages, encaisserEcheances, prevenirCartesQuiExpirent, verifierCommandesEnAttente } from "@/lib/paiement";

export type BilanQuotidien =
  | { ok: true; commandes: Record<string, number>; echeances: Record<string, number>; resiliations: number; cartes?: number; parrainages?: number }
  | { ok: false; erreur: string };

/**
 * Traitement quotidien des paiements : vérification des paiements en
 * attente, prélèvement des échéances du jour, résiliations arrivées à
 * terme. Lancé chaque matin par Vercel (« automatique ») ou depuis
 * l'administration (« manuel »).
 *
 * Chaque passage est enregistré (script brique5f) et un échec du passage
 * automatique déclenche un email à Aide & Garde (audit du 12/11/2026) : un
 * matin sans prélèvement ne doit pas passer inaperçu.
 */
export async function traitementQuotidien(db: SupabaseClient, origine: "automatique" | "manuel"): Promise<BilanQuotidien> {
  let bilan: BilanQuotidien;
  try {
    const commandes = await verifierCommandesEnAttente(db);
    const echeances = await encaisserEcheances(db);
    const { data: resiliations } = await db.rpc("appliquer_resiliations");
    // Cartes qui expirent : prévenues une fois (brique 5g). Une erreur ici ne
    // compromet pas les prélèvements déjà faits.
    const cartes = await prevenirCartesQuiExpirent(db).catch((e) => {
      console.error("Cartes qui expirent :", e);
      return 0;
    });
    // Parrainages (brique 14) : AVANT le lendemain, pour que le mois offert
    // s'applique à la prochaine échéance.
    const parrainages = await accorderParrainages(db).catch((e) => {
      console.error("Parrainages :", e);
      return 0;
    });
    bilan = { ok: true, commandes, echeances, resiliations: Number(resiliations ?? 0), cartes, parrainages };
  } catch (e) {
    console.error("Traitement quotidien Systempay :", e);
    bilan = { ok: false, erreur: (e as Error).message.slice(0, 500) };
  }

  // Trace du passage. Sans le script brique5f, l'insertion échoue : on
  // continue (le traitement lui-même a eu lieu).
  await db
    .from("traitements_quotidiens")
    .insert({ origine, ok: bilan.ok, bilan: bilan.ok ? bilan : null, erreur: bilan.ok ? null : bilan.erreur })
    .then(({ error }) => {
      if (error) console.error("Suivi du traitement quotidien (script brique5f ?) :", error.message);
    });

  // Alerte : échec complet, ou échéances restées en erreur.
  const enErreur = bilan.ok ? (bilan.echeances.erreur ?? 0) : 0;
  if (origine === "automatique" && (!bilan.ok || enErreur > 0)) {
    const site = await adresseSite().catch(() => "");
    const contenu = modeleEmail({
      titre: bilan.ok ? "Prélèvements : des échéances sont en erreur" : "Le traitement des prélèvements a échoué",
      paragraphes: [
        bilan.ok
          ? `Le traitement automatique de ce matin a eu lieu, mais ${enErreur} échéance(s) n'ont pas pu être traitées.`
          : `Le traitement automatique de ce matin n'a pas abouti : aucune échéance n'a été prélevée. Message technique : ${bilan.erreur}`,
        "Ouvrez l'onglet Abonnements de l'administration et cliquez sur « Lancer le traitement maintenant ». Si l'erreur se répète, transmettez ce message pour diagnostic.",
      ],
      ...(site ? { bouton: { texte: "Ouvrir les abonnements", url: `${site}/admin/abonnements` } } : {}),
    });
    await envoyerEmail({ a: emailAdmin(), sujet: "Aide & Garde : prélèvements à vérifier", ...contenu }).catch((e) =>
      console.error("Alerte du traitement quotidien :", e),
    );
  }
  return bilan;
}
