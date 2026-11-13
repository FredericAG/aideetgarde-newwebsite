import "server-only";
import { createHash } from "node:crypto";
import { adresseSite, emailAdmin, envoyerEmail, modeleEmail } from "@/lib/email";
import { clientServeur } from "@/lib/supabase/admin";
import { normaliserPage } from "@/lib/origine";

/**
 * Alerte par e-mail quand un utilisateur rencontre une erreur (décision du
 * 13/11/2026, audit S7) : un e-mail à Aide & Garde par erreur distincte
 * (page + message) et par heure au plus (table erreurs_site, brique13).
 * Sans le script : une alerte par heure et par erreur pour chaque serveur.
 * Ne lève jamais d'erreur elle-même.
 *
 * Rien de personnel n'est transmis : ni en-têtes, ni cookies, ni données
 * saisies ; seulement la page (identifiants masqués) et le message.
 */
const dejaSignalees = new Map<string, number>();
const UNE_HEURE = 60 * 60 * 1000;

export async function signalerErreur(e: {
  origine: "serveur" | "navigateur";
  chemin: string;
  message: string;
  reference?: string;
  detail?: string;
}): Promise<void> {
  try {
    const chemin = normaliserPage(e.chemin || "/");
    const message = (e.message || "Erreur sans message").replace(/\s+/g, " ").slice(0, 500);
    const empreinte = createHash("sha256").update(`${e.origine}|${chemin}|${message.slice(0, 200)}`).digest("hex").slice(0, 32);

    let envoyer: boolean;
    const db = clientServeur();
    const res = db ? await db.rpc("signaler_erreur", { p_empreinte: empreinte, p_chemin: chemin, p_message: message }) : null;
    if (res && !res.error) {
      envoyer = res.data === true;
    } else {
      const derniere = dejaSignalees.get(empreinte) ?? 0;
      envoyer = Date.now() - derniere > UNE_HEURE;
      if (envoyer) dejaSignalees.set(empreinte, Date.now());
    }
    if (!envoyer) return;

    const site = await adresseSite().catch(() => "");
    const heure = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    const contenu = modeleEmail({
      titre: "Un utilisateur a rencontré une erreur",
      paragraphes: [
        `Page : ${chemin} (${e.origine === "serveur" ? "erreur du serveur" : "erreur dans le navigateur"}), le ${heure}.`,
        `Message : ${message}`,
        ...(e.reference ? [`Référence : ${e.reference} (à chercher dans Vercel > Logs, gardés 24 heures).`] : []),
        ...(e.detail ? [`Détail : ${e.detail.slice(0, 300)}`] : []),
        "Les répétitions de la même erreur dans l'heure ne sont pas renvoyées. Transmettez ce message pour diagnostic si l'erreur se répète.",
      ],
      ...(site ? { bouton: { texte: "Ouvrir le site", url: `${site}${chemin.includes("[") ? "" : chemin}` } } : {}),
    });
    await envoyerEmail({ a: emailAdmin(), sujet: `Aide & Garde : erreur sur ${chemin}`, ...contenu });
  } catch (err) {
    console.error("Alerte d'erreur non envoyée :", err);
  }
}
