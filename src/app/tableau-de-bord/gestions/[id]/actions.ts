"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  MODES_FIN_CONTRAT,
  TYPES_SIGNALEMENT,
  formatDate,
  isUuid,
  libelleMois,
  libelleSignalement,
  lireHeures,
  type ModeFinContrat,
  type TypeSignalement,
} from "@/lib/data";
import { adresseSite, emailAdmin, envoyerEmail, modeleEmail } from "@/lib/email";

export interface EtatDeclaration {
  statut: "idle" | "ok" | "erreur";
  message?: string;
}

/**
 * L'abonné envoie (ou corrige) la déclaration d'un mois pour une gestion.
 * L'envoi signale au back-office que le bulletin peut être établi.
 * La base vérifie elle-même : propriétaire de la gestion, gestion en cours,
 * bulletin pas encore en ligne, déclaration pas encore traitée.
 */
export async function envoyerDeclaration(
  _etat: EtatDeclaration,
  fd: FormData,
): Promise<EtatDeclaration> {
  const gestionId = String(fd.get("gestion_id") ?? "");
  const periode = String(fd.get("periode") ?? "");
  const heures = lireHeures(String(fd.get("heures") ?? ""));
  const commentaire = String(fd.get("commentaire") ?? "").trim().slice(0, 2000);

  if (!isUuid(gestionId) || !/^\d{2}(0[1-9]|1[0-2])$/.test(periode)) {
    return { statut: "erreur", message: "Demande invalide. Rechargez la page." };
  }
  if (Number.isNaN(heures)) {
    return {
      statut: "erreur",
      message: "Nombre d'heures invalide (exemples : 151,67 ou 86).",
    };
  }

  const { supabase, user } = await requireUser(`/tableau-de-bord/gestions/${gestionId}`);

  const { data: existante } = await supabase
    .from("declarations_mensuelles")
    .select("id, statut")
    .eq("gestion_id", gestionId)
    .eq("periode", periode)
    .eq("employeur_id", user.id)
    .maybeSingle();

  if (existante && existante.statut !== "envoyee") {
    return {
      statut: "erreur",
      message: `Le bulletin de ${libelleMois(periode)} a déjà été établi : la déclaration ne peut plus être modifiée.`,
    };
  }

  const { error } = existante
    ? await supabase
        .from("declarations_mensuelles")
        .update({ heures, commentaire })
        .eq("id", existante.id)
    : await supabase
        .from("declarations_mensuelles")
        .insert({ gestion_id: gestionId, periode, heures, commentaire });

  if (error) {
    return {
      statut: "erreur",
      message:
        error.code === "P0001"
          ? error.message
          : "L'envoi n'a pas abouti. Réessayez dans un instant.",
    };
  }

  revalidatePath(`/tableau-de-bord/gestions/${gestionId}`);
  revalidatePath("/tableau-de-bord");
  return {
    statut: "ok",
    message: existante
      ? `Déclaration de ${libelleMois(periode)} mise à jour.`
      : `Déclaration de ${libelleMois(periode)} envoyée : nous établissons le bulletin.`,
  };
}

/**
 * L'abonné demande la correction d'un bulletin déjà en ligne (motif
 * obligatoire). La demande revient dans la liste « à traiter » de
 * l'administrateur, qui dépose un bulletin corrigé à la place de l'ancien.
 */
export async function demanderModification(
  _etat: EtatDeclaration,
  fd: FormData,
): Promise<EtatDeclaration> {
  const gestionId = String(fd.get("gestion_id") ?? "");
  const periode = String(fd.get("periode") ?? "");
  const motif = String(fd.get("motif") ?? "").trim().slice(0, 2000);
  if (!isUuid(gestionId) || !/^\d{2}(0[1-9]|1[0-2])$/.test(periode)) {
    return { statut: "erreur", message: "Demande invalide. Rechargez la page." };
  }
  if (motif.length < 3) {
    return { statut: "erreur", message: "Merci d'indiquer ce qui doit être corrigé." };
  }
  const { supabase } = await requireUser(`/tableau-de-bord/gestions/${gestionId}`);
  const { error } = await supabase.rpc("demander_modification_bulletin", {
    p_gestion_id: gestionId,
    p_periode: periode,
    p_motif: motif,
  });
  if (error) {
    return {
      statut: "erreur",
      message: error.code === "P0001" ? error.message : "La demande n'a pas abouti. Réessayez dans un instant.",
    };
  }
  revalidatePath(`/tableau-de-bord/gestions/${gestionId}`);
  revalidatePath("/tableau-de-bord");
  return {
    statut: "ok",
    message: `Demande de modification du bulletin de ${libelleMois(periode)} envoyée : nous vous mettons en ligne un bulletin corrigé.`,
  };
}

export interface EtatSignalement {
  statut: "idle" | "ok" | "erreur";
  message?: string;
}

/**
 * « Prévenir Aide & Garde » (cadre Actions, brique 3e) : fin de contrat,
 * accident du travail ou arrêt maladie. La demande rejoint les actions à
 * traiter de l'administration ; un email d'alerte part aussi (sans bloquer).
 */
export async function signalerEvenement(_etat: EtatSignalement, fd: FormData): Promise<EtatSignalement> {
  const gestionId = String(fd.get("gestion_id") ?? "");
  const type = String(fd.get("type") ?? "") as TypeSignalement;
  const precision = String(fd.get("precision") ?? "");
  const date = String(fd.get("date") ?? "").trim();
  const commentaire = String(fd.get("commentaire") ?? "").trim().slice(0, 2000);
  if (!isUuid(gestionId) || !(type in TYPES_SIGNALEMENT)) {
    return { statut: "erreur", message: "Demande invalide. Rechargez la page." };
  }
  if (type === "fin_contrat" && !(precision in MODES_FIN_CONTRAT)) {
    return { statut: "erreur", message: "Précisez le mode de fin de contrat." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { statut: "erreur", message: "Indiquez la date." };
  }

  const { supabase, user, profile } = await requireUser(`/tableau-de-bord/gestions/${gestionId}`);
  const { error } = await supabase.rpc("signaler_evenement", {
    p_gestion_id: gestionId,
    p_type: type,
    p_precision: type === "fin_contrat" ? precision : "",
    p_date: date,
    p_commentaire: commentaire,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { statut: "erreur", message: "Ce service n'est pas encore activé (script brique3e à exécuter dans Supabase)." };
    }
    return {
      statut: "erreur",
      message: error.code === "P0001" ? error.message : "L'envoi n'a pas abouti. Réessayez dans un instant.",
    };
  }

  // Alerte à Aide & Garde (ne bloque jamais la demande).
  const { data: g } = await supabase.from("gestions").select("prenom_salarie, nom_salarie").eq("id", gestionId).maybeSingle();
  const salarie = g ? `${g.prenom_salarie ?? ""} ${g.nom_salarie ?? ""}`.trim() : "";
  const employeur = `${profile?.prenom ?? ""} ${profile?.nom ?? ""}`.trim() || user.email || "un abonné";
  const libelle = libelleSignalement({ type, precision: type === "fin_contrat" ? (precision as ModeFinContrat) : "" });
  const site = await adresseSite();
  const contenu = modeleEmail({
    titre: libelle,
    paragraphes: [
      `${employeur} signale pour la gestion de ${salarie} : ${libelle.toLowerCase()}, date indiquée : ${formatDate(date)}.`,
      ...(commentaire ? [`« ${commentaire} »`] : []),
    ],
    bouton: { texte: "Ouvrir la fiche du compte", url: `${site}/admin/comptes/${user.id}#gestion-${gestionId}` },
  });
  await envoyerEmail({ a: emailAdmin(), sujet: `${libelle} : ${employeur} – ${salarie}`, ...contenu });

  revalidatePath(`/tableau-de-bord/gestions/${gestionId}`);
  return {
    statut: "ok",
    message:
      type === "fin_contrat"
        ? "C'est noté : nous préparons les documents de fin de contrat et revenons vers vous."
        : "C'est noté : nous établissons l'attestation de salaire et vous prévenons dès qu'elle est prête.",
  };
}
