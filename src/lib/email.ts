import "server-only";
import { headers } from "next/headers";

/**
 * Envoi d'emails transactionnels par l'API de Brevo (prestataire français
 * déjà utilisé pour les emails de connexion de Supabase).
 *
 * Variables d'environnement (Vercel) :
 * - BREVO_API_KEY : clé API Brevo (« SMTP et API » > « Clés API »). SECRET :
 *   type « Secret » dans Vercel, jamais de préfixe NEXT_PUBLIC_.
 * - EMAIL_EXPEDITEUR (facultatif) : adresse d'envoi, vérifiée dans Brevo.
 *   Par défaut contact@aideetgarde.fr (déjà vérifiée, domaine authentifié).
 * - EMAIL_ADMIN (facultatif) : adresse qui reçoit les alertes destinées à
 *   Aide & Garde (nouvelle gestion envoyée…). Par défaut contact@aideetgarde.fr.
 *
 * Comme pour les notifications sur téléphone, un email qui ne part pas ne
 * fait jamais échouer l'action qui le déclenche : on renvoie un bilan.
 */

export interface BilanEmail {
  envoye: boolean;
  /** Explication lisible quand l'email n'est pas parti. */
  raison?: string;
}

export function emailAdmin(): string {
  return process.env.EMAIL_ADMIN || "contact@aideetgarde.fr";
}

/** Adresse du site (pour les liens des emails), sans « / » final. */
export async function adresseSite(): Promise<string> {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host");
  const protocole = h.get("x-forwarded-proto") ?? "https";
  return hote ? `${protocole}://${hote}` : "https://aideetgarde-newwebsite.vercel.app";
}

function echapper(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mise en page commune des emails, aux couleurs de la charte. Styles
 * écrits directement dans les balises : c'est ce que les logiciels de
 * messagerie lisent le plus fidèlement.
 */
export function modeleEmail(o: {
  prenom?: string;
  titre: string;
  paragraphes: string[];
  bouton?: { texte: string; url: string };
  piedDePage?: string;
}): { html: string; texte: string } {
  const bonjour = o.prenom ? `Bonjour ${o.prenom},` : "Bonjour,";
  const paras = o.paragraphes
    .map((p) => `<p style="margin:0 0 14px;line-height:1.5">${echapper(p)}</p>`)
    .join("");
  const bouton = o.bouton
    ? `<p style="margin:22px 0"><a href="${o.bouton.url}" style="display:inline-block;background:#685c9b;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;border:2px solid #f6ed78">${echapper(o.bouton.texte)}</a></p>`
    : "";
  const pied = o.piedDePage
    ? `<p style="margin:24px 0 0;font-size:12px;color:#7783a6;line-height:1.5">${echapper(o.piedDePage)}</p>`
    : "";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#1c2e3e">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:12px;padding:28px 24px;border-top:6px solid #f6ed78">
<p style="margin:0 0 18px;font-size:22px;font-weight:bold"><span style="color:#376873">Aide</span><span style="color:#d9c937">&amp;</span><span style="color:#685c9b">Garde</span></p>
<h1 style="margin:0 0 16px;font-size:18px;color:#376873">${echapper(o.titre)}</h1>
<p style="margin:0 0 14px">${echapper(bonjour)}</p>
${paras}${bouton}
<p style="margin:0">L'équipe Aide &amp; Garde</p>
${pied}
</div>
<p style="text-align:center;font-size:12px;color:#7783a6;margin:16px 0 0">Aide &amp; Garde · 01 88 320 118 · contact@aideetgarde.fr</p>
</div></body></html>`;
  const texte = [
    bonjour,
    "",
    ...o.paragraphes,
    ...(o.bouton ? ["", `${o.bouton.texte} : ${o.bouton.url}`] : []),
    "",
    "L'équipe Aide & Garde",
    ...(o.piedDePage ? ["", o.piedDePage] : []),
  ].join("\n");
  return { html, texte };
}

export async function envoyerEmail(o: {
  a: string;
  nom?: string;
  sujet: string;
  html: string;
  texte: string;
}): Promise<BilanEmail> {
  const cle = process.env.BREVO_API_KEY;
  if (!cle) return { envoye: false, raison: "envoi d'emails non configuré (BREVO_API_KEY absente)" };
  if (!o.a) return { envoye: false, raison: "pas d'adresse email" };
  try {
    const reponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Aide & Garde", email: process.env.EMAIL_EXPEDITEUR || "contact@aideetgarde.fr" },
        to: [{ email: o.a, ...(o.nom ? { name: o.nom } : {}) }],
        subject: o.sujet,
        htmlContent: o.html,
        textContent: o.texte,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (reponse.ok) return { envoye: true };
    const detail = await reponse.text().catch(() => "");
    console.error("Email Brevo refusé :", reponse.status, detail);
    return {
      envoye: false,
      raison:
        reponse.status === 401
          ? "email refusé par Brevo (clé API invalide, ou adresse IP du serveur non autorisée dans Brevo > Sécurité)"
          : `email refusé par Brevo (code ${reponse.status})`,
    };
  } catch (e) {
    console.error("Email Brevo impossible :", e);
    return { envoye: false, raison: "Brevo injoignable pour le moment" };
  }
}
