"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { TYPES_DOCUMENT, TYPES_GESTION, isUuid } from "@/lib/data";

/**
 * Actions serveur du back-office. Une action serveur est un point d'entrée
 * PUBLIC (n'importe qui peut en théorie envoyer une requête vers elle) :
 * chacune commence donc par `requireAdmin()`, indépendamment du fait que la
 * page qui la porte est déjà réservée aux administrateurs. La base de
 * données (RLS) constitue la troisième barrière.
 *
 * Après chaque action, on redirige vers la fiche du compte avec un message
 * (?ok=... ou ?erreur=...) : pas de JavaScript côté navigateur nécessaire.
 */

function retour(compteId: string, type: "ok" | "erreur", message: string): never {
  redirect(`/admin/comptes/${compteId}?${type}=${encodeURIComponent(message)}`);
}

function texte(fd: FormData, nom: string): string {
  return String(fd.get(nom) ?? "").trim();
}

function nombre(fd: FormData, nom: string): number {
  return Number(texte(fd, nom).replace(",", "."));
}

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOuAujourdhui(valeur: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(valeur) ? valeur : aujourdhui();
}

function messageErreur(error: { code?: string; message: string }): string {
  // P0001 = erreur levée volontairement par une règle de la base (quota...)
  // dont le message est déjà rédigé pour être lu.
  if (error.code === "P0001") return error.message;
  return `Erreur technique : ${error.message}`;
}

/** Vérifie l'admin ET l'identifiant du compte ; renvoie le client Supabase. */
async function contexte(fd: FormData) {
  const compteId = texte(fd, "compte_id");
  if (!isUuid(compteId)) redirect("/admin");
  const { supabase } = await requireAdmin(`/admin/comptes/${compteId}`);
  return { supabase, compteId };
}

export async function creerAbonnement(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const quota = Math.trunc(nombre(fd, "quota_gestions"));
  const tarif = nombre(fd, "tarif_mensuel");
  if (!(quota >= 1)) retour(compteId, "erreur", "Le quota doit être d'au moins 1 gestion.");
  if (!(tarif >= 0)) retour(compteId, "erreur", "Tarif invalide.");

  const { error } = await supabase.from("abonnements").insert({
    employeur_id: compteId,
    quota_gestions: quota,
    tarif_mensuel: tarif,
    date_debut: dateOuAujourdhui(texte(fd, "date_debut")),
  });
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Abonnement créé.");
}

export async function modifierAbonnement(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const quota = Math.trunc(nombre(fd, "quota_gestions"));
  const tarif = nombre(fd, "tarif_mensuel");
  if (!(quota >= 1)) retour(compteId, "erreur", "Le quota doit être d'au moins 1 gestion.");
  if (!(tarif >= 0)) retour(compteId, "erreur", "Tarif invalide.");

  const { error } = await supabase
    .from("abonnements")
    .update({ quota_gestions: quota, tarif_mensuel: tarif })
    .eq("id", texte(fd, "abonnement_id"))
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Abonnement modifié.");
}

/**
 * Résilier l'abonnement : action distincte de « terminer une gestion »
 * (décision 4). Les gestions en cours ne sont PAS modifiées ici.
 */
export async function resilierAbonnement(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const { error } = await supabase
    .from("abonnements")
    .update({
      statut: "resilie",
      date_fin: aujourdhui(),
      motif_fin: texte(fd, "motif_fin") || null,
    })
    .eq("id", texte(fd, "abonnement_id"))
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Abonnement résilié (les gestions n'ont pas été modifiées).");
}

export async function creerGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const type = texte(fd, "type_gestion");
  const nom = texte(fd, "nom_salarie");
  if (!(type in TYPES_GESTION)) retour(compteId, "erreur", "Type de gestion invalide.");
  if (!nom) retour(compteId, "erreur", "Le nom du salarié est obligatoire.");

  const { error } = await supabase.from("gestions").insert({
    employeur_id: compteId,
    abonnement_id: texte(fd, "abonnement_id"),
    type_gestion: type,
    prenom_salarie: texte(fd, "prenom_salarie"),
    nom_salarie: nom,
    date_debut: dateOuAujourdhui(texte(fd, "date_debut")),
  });
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Gestion créée.");
}

/** Terminer une gestion : libère une place du quota, l'abonnement continue. */
export async function terminerGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const { error } = await supabase
    .from("gestions")
    .update({
      statut: "terminee",
      date_fin: dateOuAujourdhui(texte(fd, "date_fin")),
    })
    .eq("id", texte(fd, "gestion_id"))
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Gestion terminée (l'abonnement continue).");
}

export async function rouvrirGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const { error } = await supabase
    .from("gestions")
    .update({ statut: "en_cours", date_fin: null })
    .eq("id", texte(fd, "gestion_id"))
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Gestion rouverte.");
}

/** Suppression définitive (utile pour nettoyer des données de test). */
export async function supprimerGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const { error } = await supabase
    .from("gestions")
    .delete()
    .eq("id", texte(fd, "gestion_id"))
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Gestion et documents associés supprimés.");
}

export async function creerDocument(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const type = texte(fd, "type_document");
  const titre = texte(fd, "titre");
  const periode = texte(fd, "periode");
  if (!(type in TYPES_DOCUMENT)) retour(compteId, "erreur", "Type de document invalide.");
  if (!titre) retour(compteId, "erreur", "Le titre du document est obligatoire.");
  if (periode && !/^\d{4}$/.test(periode)) {
    retour(compteId, "erreur", "La période doit être au format AAMM (ex. 2609).");
  }

  const { error } = await supabase.from("documents").insert({
    gestion_id: texte(fd, "gestion_id"),
    type_document: type,
    titre,
    periode: periode || null,
  });
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Document ajouté.");
}

export async function supprimerDocument(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", texte(fd, "document_id"))
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Document supprimé.");
}
