"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  BUCKET,
  TYPES_DOCUMENT,
  TYPES_GESTION,
  isUuid,
  libelleMois,
  type TypeDocument,
} from "@/lib/data";
import { notifierUtilisateur } from "@/lib/push";
import { cheminStockage } from "@/lib/nom-fichier";

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
  // 23505 = violation d'une règle d'unicité posée dans la base.
  if (error.code === "23505") {
    if (error.message.includes("documents_un_bulletin_par_mois")) {
      return "Un bulletin de salaire existe déjà pour ce mois dans cette gestion. Pour le remplacer, supprimez d'abord l'ancien, puis déposez le nouveau.";
    }
    if (error.message.includes("documents_sans_doublon")) {
      return "Ce document existe déjà pour cette gestion (même type, même période et même titre).";
    }
    if (error.message.includes("abonnements_un_actif_par_employeur")) {
      return "Ce compte a déjà un abonnement actif.";
    }
    return "Cet élément existe déjà.";
  }
  // 23514 = violation d'une règle de validité (ex. période au mauvais format).
  if (error.code === "23514") {
    return "Une valeur saisie n'est pas valide (vérifiez notamment la période : AAMM, mois de 01 à 12).";
  }
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

/** Retire des fichiers du stockage ; renvoie un message d'erreur ou null. */
async function supprimerFichiers(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  chemins: string[],
): Promise<string | null> {
  if (chemins.length === 0) return null;
  const { error } = await supabase.storage.from(BUCKET).remove(chemins);
  return error ? `Impossible de supprimer le fichier : ${error.message}` : null;
}

/**
 * Suppression définitive (utile pour nettoyer des données de test).
 * Les fichiers PDF des documents de la gestion sont supprimés AVANT les
 * lignes de la base : en cas d'échec, rien n'est supprimé et aucun fichier
 * ne reste orphelin dans le stockage.
 */
export async function supprimerGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const gestionId = texte(fd, "gestion_id");

  const { data: docs } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("gestion_id", gestionId)
    .eq("employeur_id", compteId);
  const chemins = (docs ?? [])
    .map((d) => d.storage_path as string | null)
    .filter((c): c is string => Boolean(c));
  const erreurFichiers = await supprimerFichiers(supabase, chemins);
  if (erreurFichiers) retour(compteId, "erreur", erreurFichiers);

  const { error } = await supabase
    .from("gestions")
    .delete()
    .eq("id", gestionId)
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Gestion, documents et fichiers associés supprimés.");
}

export interface MetaDocument {
  compteId: string;
  gestionId: string;
  typeDocument: string;
  periode: string;
  titre: string;
}

export interface ResultatAction {
  ok: boolean;
  message: string;
}

export interface ResultatPreparation extends ResultatAction {
  documentId?: string;
  chemin?: string;
}

type ClientAdmin = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Contrôles communs aux deux temps du dépôt ; renvoie un message d'erreur ou null. */
function controlerMeta(m: MetaDocument): string | null {
  if (!isUuid(m.compteId) || !isUuid(m.gestionId)) return "Identifiants invalides.";
  if (!(m.typeDocument in TYPES_DOCUMENT)) return "Type de document invalide.";
  if (!m.titre.trim()) return "Le titre du document est obligatoire.";
  const periode = m.periode.trim();
  if (periode && !/^\d{2}(0[1-9]|1[0-2])$/.test(periode)) {
    return "La période doit être au format AAMM avec un mois de 01 à 12 (ex. 2609 pour septembre 2026).";
  }
  if (m.typeDocument === "bulletin" && !periode) {
    return "Un bulletin de salaire doit avoir une période (AAMM).";
  }
  return null;
}

/** Calcule le chemin lisible du fichier à partir des données en base. */
async function calculerChemin(
  supabase: ClientAdmin,
  m: MetaDocument,
  documentId: string,
): Promise<string | null> {
  const [{ data: employeur }, { data: gestion }] = await Promise.all([
    supabase.from("profiles").select("id, nom, prenom").eq("id", m.compteId).maybeSingle(),
    supabase
      .from("gestions")
      .select("id, nom_salarie, prenom_salarie")
      .eq("id", m.gestionId)
      .eq("employeur_id", m.compteId)
      .maybeSingle(),
  ]);
  if (!employeur || !gestion) return null;
  return cheminStockage({
    employeur: {
      id: employeur.id as string,
      nom: (employeur.nom as string) ?? "",
      prenom: (employeur.prenom as string) ?? "",
    },
    gestion: {
      id: gestion.id as string,
      nom_salarie: (gestion.nom_salarie as string) ?? "",
      prenom_salarie: (gestion.prenom_salarie as string) ?? "",
    },
    documentId,
    type: m.typeDocument,
    periode: m.periode.trim(),
    titre: m.titre.trim(),
  });
}

/**
 * Premier temps du dépôt d'un PDF : vérifie les informations saisies et
 * les doublons AVANT l'envoi du fichier (on évite d'envoyer 10 Mo pour
 * rien), puis fournit au navigateur l'identifiant et le chemin lisible
 * sous lequel il doit ranger le fichier.
 */
export async function preparerDepot(m: MetaDocument): Promise<ResultatPreparation> {
  const erreur = controlerMeta(m);
  if (erreur) return { ok: false, message: erreur };
  const { supabase } = await requireAdmin(`/admin/comptes/${m.compteId}`);

  const periode = m.periode.trim();
  const { data: existants } = await supabase
    .from("documents")
    .select("type_document, periode, titre")
    .eq("gestion_id", m.gestionId)
    .eq("employeur_id", m.compteId);
  for (const d of existants ?? []) {
    const memePeriode = (d.periode ?? "") === periode;
    if (m.typeDocument === "bulletin" && d.type_document === "bulletin" && memePeriode) {
      return {
        ok: false,
        message:
          "Un bulletin de salaire existe déjà pour ce mois dans cette gestion. Pour le remplacer, supprimez d'abord l'ancien, puis déposez le nouveau.",
      };
    }
    if (
      d.type_document === m.typeDocument &&
      memePeriode &&
      String(d.titre).trim().toLowerCase() === m.titre.trim().toLowerCase()
    ) {
      return {
        ok: false,
        message: "Ce document existe déjà pour cette gestion (même type, même période et même titre).",
      };
    }
  }

  const documentId = crypto.randomUUID();
  const chemin = await calculerChemin(supabase, m, documentId);
  if (!chemin) return { ok: false, message: "Gestion introuvable pour ce compte." };
  return { ok: true, message: "", documentId, chemin };
}

/**
 * Deuxième temps : le navigateur a envoyé le fichier directement à
 * Supabase Storage (sans passer par Vercel, dont les requêtes sont
 * limitées à environ 4,5 Mo) ; on enregistre la fiche du document. En cas
 * d'échec, on supprime le fichier envoyé pour ne laisser aucun orphelin.
 */
export async function enregistrerDocument(
  m: MetaDocument & { documentId: string; storagePath: string; nomFichier: string },
): Promise<ResultatAction> {
  if (!isUuid(m.documentId)) return { ok: false, message: "Identifiants invalides." };
  const { supabase } = await requireAdmin(`/admin/comptes/${m.compteId}`);

  const echec = async (message: string): Promise<ResultatAction> => {
    // Ne supprimer que le fichier de CE dépôt (son nom finit par son identifiant).
    if (m.storagePath.endsWith(`__${m.documentId}.pdf`)) {
      await supprimerFichiers(supabase, [m.storagePath]);
    }
    return { ok: false, message };
  };

  const erreur = controlerMeta(m);
  if (erreur) return echec(erreur);

  const cheminAttendu = await calculerChemin(supabase, m, m.documentId);
  if (!cheminAttendu) return echec("Gestion introuvable pour ce compte.");
  if (m.storagePath !== cheminAttendu) {
    return echec("Chemin de fichier inattendu, dépôt refusé.");
  }

  const periode = m.periode.trim();
  const { error } = await supabase.from("documents").insert({
    id: m.documentId,
    gestion_id: m.gestionId,
    type_document: m.typeDocument,
    titre: m.titre.trim(),
    periode: periode || null,
    storage_path: cheminAttendu,
    nom_fichier_origine: m.nomFichier.slice(0, 255),
  });
  if (error) return echec(messageErreur(error));

  // Prévenir l'abonné sur ses appareils. Le message reste volontairement
  // général (pas de nom, pas de montant) : il peut s'afficher sur un écran
  // verrouillé.
  const libelle = TYPES_DOCUMENT[m.typeDocument as TypeDocument] ?? "Document";
  await notifierUtilisateur(supabase, m.compteId, {
    title: "Nouveau document disponible",
    body: periode ? `${libelle} de ${libelleMois(periode)}` : libelle,
    url: `/tableau-de-bord/gestions/${m.gestionId}`,
    tag: `document-${m.documentId}`,
  });

  revalidatePath(`/admin/comptes/${m.compteId}`);
  return { ok: true, message: "Document déposé." };
}

/** Supprime le fichier PDF puis la fiche du document. */
export async function supprimerDocument(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const documentId = texte(fd, "document_id");

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("employeur_id", compteId)
    .maybeSingle();
  if (doc?.storage_path) {
    const erreurFichier = await supprimerFichiers(supabase, [doc.storage_path as string]);
    if (erreurFichier) retour(compteId, "erreur", erreurFichier);
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Document et fichier supprimés.");
}
