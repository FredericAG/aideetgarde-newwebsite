"use server";

import { requireUser } from "@/lib/auth";
import { adresseSite, envoyerEmail, modeleEmail } from "@/lib/email";

export interface EtatRecommandation {
  ok?: string;
  erreur?: string;
}

/** Envois autorisés par abonné et par 24 heures (lutte contre les abus). */
const LIMITE_24H = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Envoi d'une recommandation à un proche (bouche à oreille).
 *
 * Règles (CNIL, « envoyer à un ami ») : l'abonné est clairement identifié
 * comme l'auteur du message (nom affiché, réponse directe à son adresse),
 * l'adresse du destinataire ne sert qu'à cet envoi et n'est enregistrée
 * nulle part ; seule la date de l'envoi est comptée (table recommandations,
 * script brique5e). Pas de récompense : un parrainage rémunéré relèverait
 * des règles de la prospection commerciale.
 */
export async function envoyerRecommandation(
  _etat: EtatRecommandation,
  formData: FormData,
): Promise<EtatRecommandation> {
  const { supabase, user, profile } = await requireUser("/recommander");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const prenomContact = String(formData.get("prenom") ?? "").trim().slice(0, 60);
  const message = String(formData.get("message") ?? "").trim();

  if (!EMAIL.test(email) || email.length > 254) return { erreur: "Vérifiez l'adresse email de votre contact." };
  if (user.email && email === user.email.toLowerCase()) {
    return { erreur: "C'est votre propre adresse : indiquez celle de la personne à qui vous recommandez Aide & Garde." };
  }
  if (message.length < 10) return { erreur: "Votre message est vide." };
  if (message.length > 2000) return { erreur: "Votre message est trop long (2 000 caractères au plus)." };

  const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("recommandations")
    .select("id", { count: "exact", head: true })
    .eq("employeur_id", user.id)
    .gte("envoyee_le", depuis);
  if ((count ?? 0) >= LIMITE_24H) {
    return { erreur: `Vous avez déjà envoyé ${LIMITE_24H} recommandations aujourd'hui : merci ! Réessayez demain.` };
  }

  const auteur = [profile?.prenom, profile?.nom].filter(Boolean).join(" ").trim() || user.email || "Un abonné";
  const site = await adresseSite();
  const paragraphes = message
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const contenu = modeleEmail({
    prenom: prenomContact || undefined,
    titre: `${auteur} vous recommande Aide & Garde`,
    paragraphes,
    bouton: { texte: "Découvrir Aide & Garde", url: `${site}/?source=recommandation` },
    piedDePage: `Ce message vous a été écrit par ${auteur}${user.email ? ` (${user.email})` : ""} depuis le site aideetgarde.fr ; en y répondant, vous lui écrivez directement. Aide & Garde n'a pas conservé votre adresse et ne l'utilisera pour aucun autre envoi.`,
  });
  const bilan = await envoyerEmail({
    a: email,
    nom: prenomContact || undefined,
    sujet: `${auteur} vous recommande Aide & Garde`,
    nomExpediteur: `${auteur} via Aide & Garde`,
    repondreA: user.email ? { email: user.email, nom: auteur } : undefined,
    ...contenu,
  });
  if (!bilan.envoye) {
    return { erreur: `Le message n'a pas pu partir (${bilan.raison ?? "erreur inconnue"}). Réessayez plus tard.` };
  }

  await supabase.from("recommandations").insert({ employeur_id: user.id });
  return { ok: `Merci ! Votre message est parti${prenomContact ? ` pour ${prenomContact}` : ""}.` };
}
