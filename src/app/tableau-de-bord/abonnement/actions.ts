"use server";

import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { adresseSite, envoyerEmail, modeleEmail } from "@/lib/email";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { formuleParQuota } from "@/lib/formules";
import { formatEuros } from "@/lib/data";
import { clientServeur } from "@/lib/supabase/admin";
import {
  configSystempay,
  creerFormulairePaiement,
  emailAccepteParSystempay,
  lireCommande,
} from "@/lib/systempay";
import { emailAdmin } from "@/lib/email";
import { traiterReponseCommande } from "@/lib/paiement";

export type EtatPaiement =
  | { etape: "choix"; erreur?: string }
  | { etape: "formulaire"; formToken: string; orderId: string; montant: number; libelle: string };

/** Référence de commande lisible dans le Back Office Systempay. */
function referenceCommande(prefixe: "S" | "R", referenceClient: string): string {
  const d = new Date();
  const horodatage = d.toISOString().replace(/\D/g, "").slice(0, 14);
  const alea = randomBytes(2).toString("hex");
  return `${prefixe}-${referenceClient.replace(/[^A-Za-z0-9]/g, "")}-${horodatage}-${alea}`;
}

const MESSAGE_INDISPONIBLE =
  "Le paiement en ligne est momentanément indisponible. Réessayez dans quelques minutes ou contactez-nous.";

/**
 * Message d'indisponibilité. En mode TEST uniquement, la cause technique
 * est ajoutée pour faciliter la recette ; en production, l'abonné ne voit
 * jamais de détail technique (il reste dans les journaux Vercel).
 */
function indisponible(raison: string): EtatPaiement {
  console.error("Paiement indisponible :", raison);
  const enTest = !configSystempay() || configSystempay()?.mode === "TEST";
  return {
    etape: "choix",
    erreur: enTest ? `${MESSAGE_INDISPONIBLE} (Détail technique, mode test : ${raison})` : MESSAGE_INDISPONIBLE,
  };
}

/**
 * Ouvre le formulaire de paiement : premier mois d'une nouvelle formule
 * (souscription) ou échéance impayée (régularisation). Le montant est
 * TOUJOURS recalculé ici, jamais repris du navigateur.
 */
export async function preparerPaiement(
  _etat: EtatPaiement,
  formData: FormData,
): Promise<EtatPaiement> {
  const { supabase, user, profile } = await requireUser("/tableau-de-bord/abonnement");
  const config = configSystempay();
  const db = clientServeur();
  if (!config) return indisponible("clés Systempay absentes (SYSTEMPAY_BOUTIQUE, SYSTEMPAY_MOT_DE_PASSE, NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE)");
  if (!db) return indisponible("clé SUPABASE_SECRET_KEY absente");
  if (!profile) return indisponible("profil introuvable");
  if (!user.email) return { etape: "choix", erreur: "Votre compte n'a pas d'adresse email." };
  // Adresse transmise à Systempay (obligatoire pour enregistrer la carte).
  // Comptes de recette fictifs (@recette.invalid) : en mode TEST seulement,
  // l'adresse d'Aide & Garde est utilisée à la place (Systempay refuse les
  // domaines réservés) ; elle reçoit alors le ticket de paiement de test.
  let emailPaiement = user.email;
  if (!emailAccepteParSystempay(emailPaiement)) {
    if (config.mode === "TEST") emailPaiement = emailAdmin();
    else {
      return {
        etape: "choix",
        erreur: "Votre adresse email n'est pas acceptée par notre service de paiement. Contactez-nous pour la mettre à jour.",
      };
    }
  }

  const type = formData.get("type") === "regularisation" ? "regularisation" : "souscription";
  // Référence client C00012 (brique 2g) : retrouvée telle quelle dans le
  // Back Office Systempay pour chaque paiement.
  const { data: refData } = await supabase
    .from("profiles")
    .select("reference_client")
    .eq("id", user.id)
    .maybeSingle();
  const reference = (refData?.reference_client as string | undefined) || user.id.slice(0, 8);

  let montant: number;
  let libelle: string;
  let ligne: Record<string, unknown>;

  if (type === "souscription") {
    const formule = formuleParQuota(Number(formData.get("quota")));
    if (!formule) return { etape: "choix", erreur: "Choisissez une formule." };

    const [abo, places] = await Promise.all([
      supabase.from("abonnements").select("id").eq("employeur_id", user.id).eq("statut", "actif").maybeSingle(),
      supabase
        .from("gestions")
        .select("id", { count: "exact", head: true })
        .eq("employeur_id", user.id)
        .in("statut", ["envoyee", "en_cours"]),
    ]);
    if (abo.data) return { etape: "choix", erreur: "Vous avez déjà un abonnement actif." };
    if ((places.count ?? 0) > formule.quota) {
      return {
        etape: "choix",
        erreur: `Vous suivez déjà ${places.count} salariés (gestions en cours ou envoyées) : choisissez une formule d'au moins ${places.count} salariés.`,
      };
    }
    montant = formule.tarif;
    libelle = `Abonnement ${formule.libelle} – premier mois`;
    ligne = { type, quota: formule.quota, tarif_mensuel: formule.tarif, montant };
  } else {
    const echeanceId = String(formData.get("echeance") ?? "");
    // Lecture avec la session de l'abonné : il ne voit que ses échéances.
    const { data: e } = await supabase
      .from("echeances")
      .select("id, montant, statut, date_echeance")
      .eq("id", echeanceId)
      .eq("employeur_id", user.id)
      .maybeSingle();
    if (!e || (e.statut !== "impayee" && e.statut !== "a_payer")) {
      return { etape: "choix", erreur: "Cette échéance est déjà réglée." };
    }
    montant = Number(e.montant);
    libelle = "Règlement de l'échéance impayée";
    ligne = { type, echeance_id: e.id, montant };
  }

  const orderId = referenceCommande(type === "souscription" ? "S" : "R", reference);
  const { error } = await db.from("commandes").insert({
    ...ligne,
    order_id: orderId,
    employeur_id: user.id,
    mode: config.mode,
  });
  if (error) return indisponible(`enregistrement de la commande refusé par la base : ${error.message}`);

  const site = await adresseSite();
  const res = await creerFormulairePaiement({
    orderId,
    montant,
    email: emailPaiement,
    reference,
    prenom: profile.prenom,
    nom: profile.nom,
    urlNotification: `${site}/api/systempay/ipn`,
    description: `${libelle} (${formatEuros(montant)})`,
  });
  if (!res.ok) {
    await db.from("commandes").update({ statut: "abandonnee", message: res.erreur.slice(0, 300) }).eq("order_id", orderId);
    return indisponible(`Systempay a refusé la création du formulaire : ${res.erreur}`);
  }
  const formToken = String(res.answer.formToken ?? "");
  if (!formToken) return indisponible("Systempay n'a pas renvoyé de formulaire (formToken vide)");
  return { etape: "formulaire", formToken, orderId, montant, libelle };
}

/**
 * Appelée par le navigateur juste après le paiement. On ne croit pas ce
 * que dit le navigateur : on redemande le résultat à Systempay. La
 * notification (IPN) fait la même chose de son côté ; la base garantit
 * qu'un seul des deux traitements compte.
 */
export async function confirmerPaiement(orderId: string): Promise<string> {
  const { supabase, user } = await requireUser("/tableau-de-bord/abonnement");
  const { data: cmd } = await supabase
    .from("commandes")
    .select("order_id, statut")
    .eq("order_id", orderId)
    .eq("employeur_id", user.id)
    .maybeSingle();
  if (!cmd) return "inconnue";
  if (cmd.statut !== "en_attente" && cmd.statut !== "refusee") return cmd.statut as string;

  const db = clientServeur();
  if (!db) return "en_attente";
  const res = await lireCommande(orderId);
  if (!res.ok) return "en_attente";
  try {
    return await traiterReponseCommande(db, { ...res.answer, orderDetails: { orderId } }, "retour");
  } catch (e) {
    console.error("Confirmation du paiement :", e);
    return "en_attente";
  }
}

function dateFr(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

/**
 * Résiliation demandée par l'abonné (brique 5b) : effet à la fin du mois
 * civil, plus de nouveau prélèvement. Confirmation par email à l'abonné et
 * alerte à Aide & Garde.
 */
export async function resilierMonAbonnement() {
  const { supabase, user, profile } = await requireUser("/tableau-de-bord/abonnement");
  const { data, error } = await supabase.rpc("demander_resiliation");
  if (error) {
    const message = error.message.includes("demander_resiliation")
      ? "La résiliation en ligne n'est pas encore disponible. Contactez-nous."
      : error.message;
    redirect(`/tableau-de-bord/abonnement?erreur=${encodeURIComponent(message)}`);
  }
  const fin = dateFr(String(data));
  // Le mois reste dû : un éventuel dernier prélèvement est annoncé.
  const { data: abo } = await supabase
    .from("abonnements")
    .select("mode_paiement, prochaine_echeance, tarif_mensuel")
    .eq("employeur_id", user.id)
    .eq("statut", "actif")
    .maybeSingle();
  const dernier =
    abo?.mode_paiement === "systempay" && abo.prochaine_echeance && abo.prochaine_echeance <= String(data)
      ? `Le mois en cours reste dû : un dernier prélèvement de ${formatEuros(Number(abo.tarif_mensuel))} aura lieu le ${dateFr(abo.prochaine_echeance)}, puis plus aucun.`
      : abo?.mode_paiement === "systempay"
        ? "Le mois en cours est déjà réglé : aucun autre prélèvement ne sera effectué."
        : "Le mois en cours reste dû.";
  const site = await adresseSite();
  const nom = `${profile?.prenom ?? ""} ${profile?.nom ?? ""}`.trim();
  if (user.email) {
    const contenu = modeleEmail({
      prenom: profile?.prenom || undefined,
      titre: "Résiliation de votre abonnement enregistrée",
      paragraphes: [
        `Nous avons bien enregistré votre demande de résiliation. Votre abonnement reste actif jusqu'au ${fin} inclus : vous pouvez continuer à déclarer et à télécharger vos documents d'ici là.`,
        `${dernier} Vos documents restent ensuite consultables dans votre espace.`,
        "Vous avez changé d'avis ? Vous pouvez annuler la résiliation depuis votre espace jusqu'à cette date.",
      ],
      bouton: { texte: "Mon abonnement", url: `${site}/tableau-de-bord/abonnement` },
    });
    await envoyerEmail({ a: user.email, nom: nom || undefined, sujet: "Résiliation de votre abonnement Aide & Garde", ...contenu });
  }
  const alerte = modeleEmail({
    titre: "Résiliation demandée par un abonné",
    paragraphes: [
      `${nom || user.email} a demandé la résiliation de son abonnement, effective le ${fin}.`,
      "Si cet abonnement est encore prélevé par l'ancien site (abonnement Systempay de l'ancien site), pensez à arrêter ce prélèvement dans le Back Office Systempay.",
    ],
    bouton: { texte: "Ouvrir la fiche", url: `${site}/admin/comptes/${user.id}` },
  });
  await envoyerEmail({ a: emailAdmin(), sujet: `Résiliation : ${nom || user.email}`, ...alerte });
  revalidatePath("/tableau-de-bord");
  redirect(
    `/tableau-de-bord/abonnement?ok=${encodeURIComponent(`Résiliation enregistrée : votre abonnement prendra fin le ${fin}. Un email de confirmation vous a été envoyé.`)}`,
  );
}

/** Annulation de la résiliation, avant la date de fin. */
export async function annulerMaResiliation() {
  const { supabase, user, profile } = await requireUser("/tableau-de-bord/abonnement");
  const { error } = await supabase.rpc("annuler_resiliation");
  if (error) redirect(`/tableau-de-bord/abonnement?erreur=${encodeURIComponent(error.message)}`);
  const site = await adresseSite();
  const nom = `${profile?.prenom ?? ""} ${profile?.nom ?? ""}`.trim();
  const alerte = modeleEmail({
    titre: "Résiliation annulée",
    paragraphes: [`${nom || user.email} a annulé sa demande de résiliation : l'abonnement continue.`],
    bouton: { texte: "Ouvrir la fiche", url: `${site}/admin/comptes/${user.id}` },
  });
  await envoyerEmail({ a: emailAdmin(), sujet: `Résiliation annulée : ${nom || user.email}`, ...alerte });
  revalidatePath("/tableau-de-bord");
  redirect(`/tableau-de-bord/abonnement?ok=${encodeURIComponent("Résiliation annulée : votre abonnement continue normalement.")}`);
}
