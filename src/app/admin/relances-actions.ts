"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/data";
import { adresseSite, envoyerEmail, modeleEmail } from "@/lib/email";
import { contenuRelance, estModeleRelance } from "@/lib/relances";

/**
 * Envoie un email de relance standardisé à un abonné (après confirmation
 * dans l'administration) et l'enregistre dans l'historique des relances.
 * Part même si l'abonné a désactivé les notifications par email : c'est un
 * message personnel d'Aide & Garde sur son contrat, pas une notification.
 */
export async function envoyerRelance(
  compteId: string,
  modele: string,
): Promise<{ ok: boolean; message: string }> {
  const { supabase, profile: admin } = await requireAdmin("/admin");
  if (!isUuid(compteId) || !estModeleRelance(modele)) {
    return { ok: false, message: "Demande invalide." };
  }
  const { data: p } = await supabase
    .from("profiles")
    .select("prenom, nom, email")
    .eq("id", compteId)
    .maybeSingle();
  if (!p?.email) return { ok: false, message: "Ce compte n'a pas d'adresse email." };

  const c = contenuRelance(modele);
  const site = await adresseSite();
  const contenu = modeleEmail({
    prenom: (p.prenom as string) || undefined,
    titre: c.titre,
    paragraphes: c.paragraphes,
    bouton: { texte: c.lien.texte, url: `${site}${c.lien.chemin}` },
  });
  const bilan = await envoyerEmail({
    a: p.email as string,
    nom: `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || undefined,
    sujet: c.sujet,
    ...contenu,
  });

  const { error } = await supabase.from("relances").insert({
    employeur_id: compteId,
    modele,
    sujet: c.sujet,
    envoye_par: admin.id,
    envoye: bilan.envoye,
    detail: bilan.envoye ? null : (bilan.raison ?? null),
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/comptes/${compteId}`);

  if (!bilan.envoye) return { ok: false, message: `Email non envoyé : ${bilan.raison}` };
  return {
    ok: true,
    message: error
      ? `Email envoyé à ${p.email} (historique non enregistré : exécutez supabase/brique9c_relances.sql).`
      : `Email envoyé à ${p.email}.`,
  };
}
