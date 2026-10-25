"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { TYPES_GESTION, isUuid, type TypeGestion } from "@/lib/data";
import { champsManquants, nettoyerValeurs } from "@/lib/contrat/champs";
import { adresseSite, emailAdmin, envoyerEmail, modeleEmail } from "@/lib/email";

/**
 * Actions de l'abonné sur ses gestions (brique 3). Les règles (qui peut
 * modifier quoi, champs obligatoires pour envoyer, quota) sont vérifiées
 * par les fonctions de la base (supabase/brique3_gestions_abonne.sql) ; ici
 * on prépare les valeurs et on traduit les erreurs.
 */

export interface EtatFormulaireGestion {
  message?: string;
}

function texte(fd: FormData, nom: string): string {
  return String(fd.get(nom) ?? "").trim();
}

function nombreOuNull(fd: FormData, nom: string): number | null {
  const t = texte(fd, nom).replace(",", ".").replace(/\s/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function dateOuNull(fd: FormData, nom: string): string | null {
  const t = texte(fd, nom);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function traduire(error: { code?: string; message: string }): string {
  if (error.code === "P0001") return error.message;
  if (error.code === "23505") return "Un remplacement est déjà prévu pour ce salarié absent.";
  if (error.code === "23514") return "Une valeur saisie n'est pas valide : vérifiez les heures et le salaire.";
  if (error.code === "PGRST202" || error.code === "42883") {
    return "La création de gestion n'est pas encore activée (script brique3 à exécuter dans Supabase).";
  }
  // Erreur imprévue : message général, avec le code pour le diagnostic.
  console.error("Gestion : erreur inattendue", error);
  return `L'enregistrement n'a pas abouti. Réessayez dans un instant ; si cela se reproduit, contactez Aide & Garde (code ${error.code ?? "inconnu"}).`;
}

export async function enregistrerGestion(
  _prec: EtatFormulaireGestion,
  fd: FormData,
): Promise<EtatFormulaireGestion> {
  const { supabase, user, profile } = await requireUser("/tableau-de-bord");
  const idTexte = texte(fd, "gestion_id");
  const id = isUuid(idTexte) ? idTexte : null;
  const envoyer = texte(fd, "intention") === "envoyer";

  const typeGestion = texte(fd, "type_gestion") as TypeGestion;
  const typeContrat = texte(fd, "type_contrat");
  const heures = nombreOuNull(fd, "heures");
  const salaire = nombreOuNull(fd, "salaire_horaire_net");
  if (Number.isNaN(heures)) return { message: "Le nombre d'heures doit être un nombre (ex. 20 ou 86,67)." };
  if (Number.isNaN(salaire)) return { message: "Le salaire horaire doit être un montant (ex. 12,50)." };
  const unite = texte(fd, "unite_heures");
  const remplacement = texte(fd, "remplacement") === "oui";
  const remplace = texte(fd, "remplace_gestion_id");
  const motif = texte(fd, "motif_remplacement");
  if (remplacement && (!isUuid(remplace) || !motif)) {
    return { message: "Pour un remplacement, choisissez le salarié remplacé et le motif de son absence." };
  }

  const { data: nouvelId, error } = await supabase.rpc("gestion_enregistrer_brouillon", {
    p_id: id,
    p_type_gestion: typeGestion,
    p_prenom: texte(fd, "prenom_salarie"),
    p_nom: texte(fd, "nom_salarie"),
    p_date_debut: dateOuNull(fd, "date_debut"),
    p_type_contrat: typeContrat === "CDI" || typeContrat === "CDD" ? typeContrat : null,
    p_date_fin_prevue: typeContrat === "CDD" ? dateOuNull(fd, "date_fin_prevue") : null,
    p_heures: heures,
    p_unite_heures: unite === "semaine" || unite === "mois" ? unite : null,
    p_salaire_horaire_net: salaire,
    p_precisions: texte(fd, "precisions").slice(0, 2000),
    // CDD de remplacement (brique 3d) : hors quota.
    p_remplace_gestion_id: remplacement && isUuid(remplace) ? remplace : null,
    p_motif_remplacement: remplacement && (motif === "conge_maternite" || motif === "arret_maladie") ? motif : null,
  });
  if (error) return { message: traduire(error) };
  const gestionId = (nouvelId as string) ?? id;

  // Champs complémentaires du contrat (brique 3f).
  let brut: Record<string, string> = {};
  try {
    const lu = JSON.parse(texte(fd, "details") || "{}");
    if (lu && typeof lu === "object" && !Array.isArray(lu)) brut = lu as Record<string, string>;
  } catch {
    /* rien de lisible : aucun champ complémentaire */
  }
  const contexteChamps = {
    type_gestion: typeGestion,
    type_contrat: typeContrat,
    remplacement,
  };
  const { config, colonnes } = nettoyerValeurs(brut, contexteChamps);
  const { error: errDetails } = await supabase.rpc("gestion_enregistrer_details", {
    p_id: gestionId,
    p_config: config,
    p_civilite_salarie: colonnes.civilite_salarie ?? "",
    p_adresse_salarie: colonnes.adresse_salarie ?? "",
    p_code_postal_salarie: colonnes.code_postal_salarie ?? "",
    p_ville_salarie: colonnes.ville_salarie ?? "",
  });
  // Sans le script brique3f, les champs complémentaires ne sont pas
  // enregistrés, mais le brouillon et l'envoi fonctionnent comme avant.
  const detailsActifs = !errDetails || !(errDetails.code === "PGRST202" || errDetails.code === "42883");
  if (errDetails && detailsActifs) return { message: traduire(errDetails) };

  if (envoyer && detailsActifs) {
    const manquants = champsManquants({ ...config, ...colonnes } as Record<string, string>, contexteChamps);
    if (manquants.length) {
      const message = `Brouillon enregistré. Avant d'envoyer, complétez : ${manquants.join(", ")}.`;
      revalidatePath(`/tableau-de-bord/gestions/${gestionId}`);
      if (!id) redirect(`/tableau-de-bord/gestions/${gestionId}?erreur=${encodeURIComponent(message)}`);
      return { message };
    }
  }

  if (envoyer) {
    const { error: errEnvoi } = await supabase.rpc("gestion_envoyer", { p_id: gestionId });
    if (errEnvoi) {
      // Le brouillon est enregistré ; on reste sur le formulaire avec le
      // message (ex. champ manquant, quota atteint).
      revalidatePath(`/tableau-de-bord/gestions/${gestionId}`);
      if (!id) redirect(`/tableau-de-bord/gestions/${gestionId}?erreur=${encodeURIComponent(`Brouillon enregistré, mais pas encore envoyé : ${traduire(errEnvoi)}`)}`);
      return { message: `Brouillon enregistré, mais pas encore envoyé : ${traduire(errEnvoi)}` };
    }

    // Alerte à Aide & Garde (ne bloque jamais l'envoi).
    const salarie = `${texte(fd, "prenom_salarie")} ${texte(fd, "nom_salarie")}`.trim();
    const employeur = `${profile?.prenom ?? ""} ${profile?.nom ?? ""}`.trim() || user.email || "un abonné";
    const site = await adresseSite();
    const contenu = modeleEmail({
      titre: "Nouvelle gestion à valider",
      paragraphes: [
        `${employeur} vient d'envoyer une gestion : ${salarie} (${TYPES_GESTION[typeGestion] ?? "emploi"}).`,
        ...(remplacement
          ? [`C'est un CDD de remplacement (${motif === "conge_maternite" ? "congé maternité" : "arrêt maladie"}), hors quota : vérifiez le salarié remplacé et le motif.`]
          : []),
        "Vérifiez les informations du contrat, puis validez la gestion ou renvoyez-la à l'abonné pour qu'il la complète.",
      ],
      bouton: { texte: "Ouvrir la fiche du compte", url: `${site}/admin/comptes/${user.id}#gestion-${gestionId}` },
    });
    await envoyerEmail({ a: emailAdmin(), sujet: `Gestion à valider : ${employeur} – ${salarie}`, ...contenu });

    revalidatePath("/tableau-de-bord");
    redirect(
      `/tableau-de-bord/gestions/${gestionId}?ok=${encodeURIComponent("Gestion envoyée à Aide & Garde. Vous serez prévenu dès qu'elle sera validée.")}`,
    );
  }

  revalidatePath("/tableau-de-bord");
  redirect(
    `/tableau-de-bord/gestions/${gestionId}?ok=${encodeURIComponent("Brouillon enregistré. Vous pourrez le compléter et l'envoyer quand vous voulez.")}`,
  );
}

export async function supprimerBrouillon(fd: FormData) {
  const { supabase } = await requireUser("/tableau-de-bord");
  const id = texte(fd, "gestion_id");
  if (!isUuid(id)) redirect("/tableau-de-bord");
  const { error } = await supabase.rpc("gestion_supprimer_brouillon", { p_id: id });
  if (error) {
    redirect(`/tableau-de-bord/gestions/${id}?erreur=${encodeURIComponent(traduire(error))}`);
  }
  revalidatePath("/tableau-de-bord");
  redirect(`/tableau-de-bord?ok=${encodeURIComponent("Brouillon supprimé.")}`);
}

export async function annulerEnvoi(fd: FormData) {
  const { supabase } = await requireUser("/tableau-de-bord");
  const id = texte(fd, "gestion_id");
  if (!isUuid(id)) redirect("/tableau-de-bord");
  const { error } = await supabase.rpc("gestion_annuler_envoi", { p_id: id });
  revalidatePath("/tableau-de-bord");
  redirect(
    `/tableau-de-bord/gestions/${id}?${error ? "erreur" : "ok"}=${encodeURIComponent(
      error ? traduire(error) : "Envoi annulé : vous pouvez modifier la gestion, puis l'envoyer à nouveau.",
    )}`,
  );
}

export interface EtatAvenant {
  ok?: boolean;
  message?: string;
}

/** Brique 3b : l'abonné demande un avenant sur une gestion en cours. */
export async function demanderAvenant(_prec: EtatAvenant, fd: FormData): Promise<EtatAvenant> {
  const { supabase, user, profile } = await requireUser("/tableau-de-bord");
  const gestionId = texte(fd, "gestion_id");
  if (!isUuid(gestionId)) return { message: "Gestion inconnue." };
  const objets = fd.getAll("objets").map(String);
  const description = texte(fd, "description");

  const { error } = await supabase.rpc("demander_avenant", {
    p_gestion_id: gestionId,
    p_objets: objets,
    p_date_effet: dateOuNull(fd, "date_effet"),
    p_description: description,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { message: "Les demandes d'avenant ne sont pas encore activées (script brique3b à exécuter dans Supabase)." };
    }
    return { message: traduire(error) };
  }

  // Alerte à Aide & Garde (ne bloque jamais la demande).
  const { data: g } = await supabase
    .from("gestions")
    .select("prenom_salarie, nom_salarie")
    .eq("id", gestionId)
    .maybeSingle();
  const salarie = g ? `${g.prenom_salarie ?? ""} ${g.nom_salarie ?? ""}`.trim() : "";
  const employeur = `${profile?.prenom ?? ""} ${profile?.nom ?? ""}`.trim() || user.email || "un abonné";
  const site = await adresseSite();
  const contenu = modeleEmail({
    titre: "Demande d'avenant",
    paragraphes: [
      `${employeur} demande un avenant pour la gestion de ${salarie}.`,
      `« ${description} »`,
    ],
    bouton: { texte: "Ouvrir la fiche du compte", url: `${site}/admin/comptes/${user.id}#gestion-${gestionId}` },
  });
  await envoyerEmail({ a: emailAdmin(), sujet: `Demande d'avenant : ${employeur} – ${salarie}`, ...contenu });

  revalidatePath(`/tableau-de-bord/gestions/${gestionId}`);
  return {
    ok: true,
    message: "Demande envoyée. Aide & Garde prépare l'avenant et vous prévient dès qu'il est disponible.",
  };
}
