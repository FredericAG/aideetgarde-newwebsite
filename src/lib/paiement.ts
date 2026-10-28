import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adresseSite, emailAdmin, envoyerEmail, modeleEmail } from "@/lib/email";
import { prevenirAbonne } from "@/lib/prevenir";
import { formatDate, formatEuros } from "@/lib/data";
import {
  configSystempay,
  debiterAlias,
  lireCommande,
  resumerReponse,
} from "@/lib/systempay";

/**
 * Traitements de paiement côté serveur. Toutes les écritures passent par
 * les fonctions SQL de supabase/brique5a_paiements.sql, qui garantissent
 * qu'un même paiement n'est compté qu'une fois.
 */

type Source = "ipn" | "retour" | "reconciliation";

/** Résultat d'une commande (souscription ou régularisation). */
export async function traiterReponseCommande(
  db: SupabaseClient,
  answer: Record<string, unknown>,
  source: Source,
): Promise<string> {
  const config = configSystempay();
  const { orderId, statut, transaction } = resumerReponse(answer);
  if (!orderId || !config) return "reponse_incomplete";
  // Paiement encore en cours (3-D Secure…) : la notification finale suivra.
  if (statut === "RUNNING" || !statut) return "en_cours";

  const { data, error } = await db.rpc("systempay_resultat_commande", {
    p_order_id: orderId,
    p_transaction: transaction?.uuid ?? null,
    p_statut: statut,
    p_statut_detaille: transaction?.statutDetaille ?? null,
    p_code_erreur: transaction?.codeErreur ?? null,
    p_montant: transaction?.montant ?? 0,
    p_token: transaction?.token ?? null,
    p_carte: transaction?.carte ?? null,
    p_expiration: transaction?.expiration ?? null,
    p_mode: config.mode,
    p_source: source,
  });
  if (error) throw new Error(`Enregistrement du paiement ${orderId} : ${error.message}`);
  const resultat = data as string;

  // Les messages ne partent qu'au premier traitement (« deja_traitee »
  // ensuite) : jamais deux emails pour un même paiement.
  if (resultat === "abonnement_cree" || resultat === "echeance_reglee" || resultat === "a_verifier") {
    const { data: cmd } = await db
      .from("commandes")
      .select("employeur_id, type, quota, montant, message, profiles(prenom, nom, email, reference_client)")
      .eq("order_id", orderId)
      .maybeSingle();
    if (cmd) await prevenirApresCommande(db, resultat, orderId, cmd as unknown as CommandeLue);
  }
  return resultat;
}

interface CommandeLue {
  employeur_id: string;
  type: string;
  quota: number | null;
  montant: number;
  message: string | null;
  profiles: { prenom: string; nom: string; email: string | null; reference_client: string | null } | null;
}

async function prevenirApresCommande(
  db: SupabaseClient,
  resultat: string,
  orderId: string,
  cmd: CommandeLue,
) {
  const qui = `${cmd.profiles?.prenom ?? ""} ${cmd.profiles?.nom ?? ""}`.trim() || "Un abonné";
  const site = await adresseSite();
  try {
    if (resultat === "abonnement_cree") {
      await prevenirAbonne(
        db,
        cmd.employeur_id,
        { title: "Abonnement activé", body: "Votre abonnement Aide & Garde est actif.", url: "/tableau-de-bord" },
        {
          sujet: "Votre abonnement Aide & Garde est actif",
          titre: "Votre abonnement est actif",
          paragraphes: [
            `Nous avons bien reçu votre paiement de ${formatEuros(cmd.montant)} pour le premier mois.`,
            `Votre abonnement permet de suivre ${cmd.quota} salarié${(cmd.quota ?? 1) > 1 ? "s" : ""}. Vous pouvez dès maintenant créer vos gestions depuis votre tableau de bord.`,
            "Les mois suivants, le montant de l'abonnement sera prélevé automatiquement sur la carte enregistrée.",
          ],
          bouton: "Ouvrir mon tableau de bord",
        },
      );
      await envoyerAdmin(`Nouvel abonnement en ligne : ${qui}`, "Nouvel abonnement souscrit en ligne", [
        `${qui} (${cmd.profiles?.reference_client ?? ""}) a souscrit un abonnement de ${cmd.quota} salarié(s), ${formatEuros(cmd.montant)} par mois.`,
        `Référence de paiement : ${orderId}.`,
      ], `${site}/admin/comptes/${cmd.employeur_id}`);
    } else if (resultat === "echeance_reglee") {
      await envoyerAdmin(`Échéance régularisée : ${qui}`, "Échéance impayée régularisée", [
        `${qui} a réglé en ligne son échéance impayée (${formatEuros(cmd.montant)}) et enregistré une nouvelle carte.`,
      ], `${site}/admin/comptes/${cmd.employeur_id}`);
    } else if (resultat === "a_verifier") {
      await envoyerAdmin(`Paiement à vérifier : ${qui}`, "Un paiement demande votre attention", [
        `Paiement ${orderId} de ${qui} : ${cmd.message ?? "à vérifier"}`,
        "Voir l'onglet Abonnements, rubrique « Paiements à vérifier », et le Back Office Systempay.",
      ], `${site}/admin/abonnements`);
    }
  } catch (e) {
    console.error("Message après paiement non envoyé :", e);
  }
}

async function envoyerAdmin(sujet: string, titre: string, paragraphes: string[], url: string) {
  const contenu = modeleEmail({ titre, paragraphes, bouton: { texte: "Ouvrir l'administration", url } });
  await envoyerEmail({ a: emailAdmin(), sujet, ...contenu });
}

/**
 * Email à l'abonné après un refus d'échéance. Il part même si l'abonné a
 * désactivé les notifications par email : c'est une information de
 * paiement, pas une notification de service.
 */
async function prevenirRefus(
  db: SupabaseClient,
  employeurId: string,
  montant: number,
  prochaineTentative: string | null,
) {
  const { data: p } = await db
    .from("profiles")
    .select("prenom, nom, email, reference_client")
    .eq("id", employeurId)
    .maybeSingle();
  if (!p?.email) return;
  const site = await adresseSite();
  const paragraphes = prochaineTentative
    ? [
        `Le prélèvement de votre abonnement (${formatEuros(montant)}) a été refusé par votre banque.`,
        `Nous le présenterons à nouveau automatiquement le ${formatDate(prochaineTentative)}. Si votre carte a changé ou expiré, vous pouvez régler dès maintenant avec une nouvelle carte.`,
      ]
    : [
        `Le prélèvement de votre abonnement (${formatEuros(montant)}) a été refusé trois fois par votre banque.`,
        "Pour que le suivi de vos salariés continue sans interruption, réglez cette échéance en ligne avec une carte valide : elle sera enregistrée pour les mois suivants.",
      ];
  const contenu = modeleEmail({
    prenom: (p.prenom as string) || undefined,
    titre: prochaineTentative ? "Prélèvement refusé" : "Échéance impayée",
    paragraphes,
    bouton: { texte: "Régler mon abonnement", url: `${site}/tableau-de-bord/abonnement` },
  });
  await envoyerEmail({
    a: p.email as string,
    nom: `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || undefined,
    sujet: prochaineTentative ? "Prélèvement refusé – Aide & Garde" : "Échéance impayée – Aide & Garde",
    ...contenu,
  });
  if (!prochaineTentative) {
    await envoyerAdmin(
      `Échéance impayée : ${p.prenom ?? ""} ${p.nom ?? ""}`.trim(),
      "Échéance impayée après 3 tentatives",
      [`${p.prenom ?? ""} ${p.nom ?? ""} (${p.reference_client ?? ""}) : échéance de ${formatEuros(montant)} refusée trois fois. L'abonné a été invité à régler en ligne.`],
      `${site}/admin/comptes/${employeurId}`,
    );
  }
}

interface EcheanceATraiter {
  echeance_id: string;
  order_id: string;
  montant: number;
  token: string;
  employeur_id: string;
  email: string | null;
  reference: string;
  incertaine: boolean;
}

/**
 * Encaisse les échéances du jour (tâche quotidienne). Quelques débits en
 * parallèle seulement, pour rester loin des limites de Systempay.
 */
export async function encaisserEcheances(db: SupabaseClient): Promise<Record<string, number>> {
  const config = configSystempay();
  if (!config) return { non_configure: 1 };
  const { data, error } = await db.rpc("systempay_echeances_a_traiter", { p_limite: 500 });
  if (error) throw new Error(`Échéances : ${error.message}`);
  const liste = (data ?? []) as EcheanceATraiter[];
  const bilan: Record<string, number> = {};
  const compter = (k: string) => (bilan[k] = (bilan[k] ?? 0) + 1);
  // Notifications de nos débits vers ce site, jamais vers l'ancien.
  const urlNotification = `${await adresseSite()}/api/systempay/ipn`;

  async function une(e: EcheanceATraiter) {
    // Résultat inconnu au passage précédent : on vérifie chez Systempay
    // avant tout nouveau débit.
    if (e.incertaine) {
      const verif = await lireCommande(e.order_id);
      if (!verif.ok && verif.incertain) {
        compter("verification_impossible");
        return;
      }
      // Erreur certaine (PSP_010 « transaction not found ») : le débit
      // précédent n'a jamais atteint Systempay, on peut débiter.
      const deja = resumerReponse(verif.ok ? verif.answer : {});
      if (deja.statut === "PAID" || deja.statut === "RUNNING") {
        const r = await enregistrerEcheance(db, e, deja.statut === "PAID" ? "PAID" : "INCONNU", deja.transaction, "reconciliation", config!.mode);
        compter(r);
        return;
      }
    }

    const res = await debiterAlias({
      orderId: e.order_id,
      montant: Number(e.montant),
      token: e.token,
      email: e.email,
      reference: e.reference,
      urlNotification,
    });
    if (!res.ok) {
      // Erreur certaine (alias invalide…) = refus ; sinon résultat inconnu.
      const r = await enregistrerEcheance(
        db,
        e,
        res.incertain ? "INCONNU" : "UNPAID",
        { uuid: null, statut: "UNPAID", statutDetaille: null, codeErreur: res.erreur.slice(0, 200), montant: Number(e.montant), token: null, carte: null, expiration: null },
        "echeance",
        config!.mode,
      );
      compter(r);
      return;
    }
    const resume = resumerReponse(res.answer);
    const r = await enregistrerEcheance(
      db,
      e,
      resume.statut === "PAID" ? "PAID" : resume.statut === "RUNNING" ? "INCONNU" : "UNPAID",
      resume.transaction,
      "echeance",
      config!.mode,
    );
    compter(r);
  }

  const PARALLELE = 4;
  for (let i = 0; i < liste.length; i += PARALLELE) {
    await Promise.all(
      liste.slice(i, i + PARALLELE).map((e) =>
        une(e).catch((err) => {
          console.error("Échéance", e.order_id, err);
          compter("erreur");
        }),
      ),
    );
  }
  return bilan;
}

async function enregistrerEcheance(
  db: SupabaseClient,
  e: EcheanceATraiter,
  statut: "PAID" | "UNPAID" | "INCONNU",
  t: ReturnType<typeof resumerReponse>["transaction"],
  source: "echeance" | "reconciliation",
  mode: string,
): Promise<string> {
  const { data, error } = await db.rpc("systempay_resultat_echeance", {
    p_echeance: e.echeance_id,
    p_transaction: t?.uuid ?? null,
    p_statut: statut,
    p_statut_detaille: t?.statutDetaille ?? null,
    p_code_erreur: t?.codeErreur ?? null,
    p_montant: t?.montant || Number(e.montant),
    p_carte: t?.carte ?? null,
    p_mode: mode,
    p_source: source,
  });
  if (error) throw new Error(error.message);
  const resultat = String(data);
  if (resultat.startsWith("refusee_retentee:")) {
    await prevenirRefus(db, e.employeur_id, Number(e.montant), resultat.split(":")[1]).catch(() => {});
    return "refusee_retentee";
  }
  if (resultat === "impayee") {
    await prevenirRefus(db, e.employeur_id, Number(e.montant), null).catch(() => {});
  }
  return resultat;
}

/**
 * Filet de sécurité : commandes restées « en attente » (notification
 * jamais reçue, navigateur fermé). On redemande le résultat à Systempay.
 * Au-delà de 2 jours sans transaction, la commande est abandonnée.
 */
export async function verifierCommandesEnAttente(db: SupabaseClient): Promise<Record<string, number>> {
  const bilan: Record<string, number> = {};
  const compter = (k: string) => (bilan[k] = (bilan[k] ?? 0) + 1);
  const ilYa = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  const { data } = await db
    .from("commandes")
    .select("order_id, created_at")
    .eq("statut", "en_attente")
    .lt("created_at", ilYa(15))
    .gt("created_at", ilYa(60 * 24 * 7))
    .order("created_at")
    .limit(30);
  for (const c of data ?? []) {
    const res = await lireCommande(c.order_id as string);
    if (!res.ok && res.incertain) {
      compter("verification_impossible");
      continue;
    }
    // Erreur certaine de Systempay (commande inconnue) = aucune transaction.
    const answer = res.ok ? res.answer : {};
    const resume = resumerReponse({ ...answer, orderDetails: { orderId: c.order_id } });
    if (resume.transaction && res.ok) {
      compter(await traiterReponseCommande(db, { ...res.answer, orderDetails: { orderId: c.order_id } }, "reconciliation"));
    } else if (new Date(c.created_at as string) < new Date(ilYa(60 * 24 * 2))) {
      await db.from("commandes").update({ statut: "abandonnee", traitee_le: new Date().toISOString() })
        .eq("order_id", c.order_id).eq("statut", "en_attente");
      compter("abandonnee");
    } else {
      compter("sans_transaction");
    }
  }
  return bilan;
}
