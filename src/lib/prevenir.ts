import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifierUtilisateur, resumerBilan, type MessagePush } from "@/lib/push";
import { adresseSite, envoyerEmail, modeleEmail } from "@/lib/email";

/**
 * Prévenir un abonné d'un événement de son espace (nouveau document,
 * gestion validée…) : notification sur ses appareils ET copie par email,
 * sauf s'il a désactivé les emails dans « Mon compte ». Renvoie un résumé
 * lisible pour l'administrateur. Ne fait jamais échouer l'action appelante.
 *
 * Contenu volontairement sobre : jamais de montant ni de pièce jointe ; le
 * document se télécharge depuis l'espace sécurisé.
 */
export async function prevenirAbonne(
  supabase: SupabaseClient,
  compteId: string,
  push: MessagePush,
  email: { sujet: string; titre: string; paragraphes: string[]; bouton: string },
): Promise<string> {
  const bilanPush = await notifierUtilisateur(supabase, compteId, push);

  // select("*") : fonctionne aussi tant que le script brique9b n'a pas été
  // exécuté (la préférence vaut alors « oui » par défaut).
  const { data: profil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", compteId)
    .maybeSingle();

  let resumeEmail: string;
  if (!profil?.email) {
    resumeEmail = "pas d'email (adresse inconnue)";
  } else if (profil.notifications_email === false) {
    resumeEmail = "pas d'email (désactivé par l'abonné)";
  } else {
    const site = await adresseSite();
    const contenu = modeleEmail({
      prenom: (profil.prenom as string) || undefined,
      titre: email.titre,
      paragraphes: email.paragraphes,
      bouton: { texte: email.bouton, url: `${site}${push.url}` },
      piedDePage:
        "Vous recevez cet email parce que les notifications par email sont activées dans votre espace. Vous pouvez les désactiver dans « Mon compte ».",
    });
    const bilan = await envoyerEmail({
      a: profil.email as string,
      nom: `${profil.prenom ?? ""} ${profil.nom ?? ""}`.trim() || undefined,
      sujet: email.sujet,
      ...contenu,
    });
    resumeEmail = bilan.envoye ? `email envoyé à ${profil.email}` : `email non envoyé : ${bilan.raison}`;
  }

  return `${resumerBilan(bilanPush)} ; ${resumeEmail}`;
}
