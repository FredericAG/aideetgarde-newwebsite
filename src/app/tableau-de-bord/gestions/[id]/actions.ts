"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isUuid, libelleMois, lireHeures } from "@/lib/data";

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

  if (existante?.statut === "traitee") {
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
