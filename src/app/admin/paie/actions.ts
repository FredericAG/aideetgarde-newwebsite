"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { adresseSite, envoyerEmail, modeleEmail } from "@/lib/email";
import { comptesARelancer, lirePaieDuMois, periodeValide } from "@/lib/paie-du-mois";
import { contenuRelance } from "@/lib/relances";

/** Au plus ce nombre d'emails par clic (le reste au clic suivant). */
const MAXIMUM_PAR_ENVOI = 200;

/**
 * Relance groupée (audit du 12/11/2026) : envoie le rappel « Déclaration du
 * mois » à chaque abonné dont au moins un salarié en cours n'a ni
 * déclaration ni bulletin pour le mois. Un seul email par abonné ; ceux qui
 * ont déjà été relancés ces derniers jours sont écartés. La liste est
 * recalculée ici, côté serveur, au moment de l'envoi.
 */
export async function relancerSansDeclaration(periode: string): Promise<{ ok: boolean; message: string }> {
  const { supabase, profile: admin } = await requireAdmin("/admin/paie");
  if (!periodeValide(periode)) return { ok: false, message: "Mois invalide." };

  const lignes = await lirePaieDuMois(supabase, periode);
  const { aRelancer } = await comptesARelancer(supabase, lignes);
  if (aRelancer.length === 0) return { ok: true, message: "Personne à relancer pour ce mois." };

  // Le message parle du mois affiché, pas du mois en cours.
  const c = contenuRelance("declaration_mois", new Date(2000 + Number(periode.slice(0, 2)), Number(periode.slice(2, 4)) - 1, 15));
  const site = await adresseSite();
  const lot = aRelancer.slice(0, MAXIMUM_PAR_ENVOI);
  let envoyes = 0;
  const echecs: string[] = [];

  const PARALLELE = 5;
  for (let i = 0; i < lot.length; i += PARALLELE) {
    await Promise.all(
      lot.slice(i, i + PARALLELE).map(async (compte) => {
        const contenu = modeleEmail({
          prenom: compte.prenom || undefined,
          titre: c.titre,
          paragraphes: c.paragraphes,
          bouton: { texte: c.lien.texte, url: `${site}${c.lien.chemin}` },
        });
        const bilan = await envoyerEmail({
          a: compte.email,
          nom: `${compte.prenom} ${compte.nom}`.trim() || undefined,
          sujet: c.sujet,
          ...contenu,
        }).catch((e) => ({ envoye: false as const, raison: (e as Error).message }));
        if (bilan.envoye) envoyes++;
        else echecs.push(`${compte.prenom} ${compte.nom}`.trim() || compte.email);
        // Trace de la relance (réussie ou non), comme pour une relance à l'unité.
        await supabase.from("relances").insert({
          employeur_id: compte.id,
          modele: "declaration_mois",
          sujet: c.sujet,
          envoye_par: admin.id,
          envoye: bilan.envoye,
          detail: bilan.envoye ? "relance groupée" : (bilan.raison ?? null),
        });
      }),
    );
  }

  revalidatePath("/admin/paie");
  revalidatePath("/admin");
  const reste = aRelancer.length - lot.length;
  return {
    ok: echecs.length === 0,
    message:
      `${envoyes} email(s) envoyé(s).` +
      (echecs.length ? ` ${echecs.length} échec(s) : ${echecs.slice(0, 5).join(", ")}${echecs.length > 5 ? "…" : ""}.` : "") +
      (reste > 0 ? ` Il reste ${reste} abonné(s) : cliquez de nouveau pour continuer.` : ""),
  };
}
