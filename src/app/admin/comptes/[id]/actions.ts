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
import { prevenirAbonne } from "@/lib/prevenir";
import { cheminStockage, titreDocument } from "@/lib/nom-fichier";

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
      return "Ce document existe déjà pour cette gestion (même type, même période et même précision).";
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
  /** Calculé par le serveur (type, période, précision) : la valeur reçue est ignorée. */
  titre?: string;
  /** Précision facultative (« Démission », « n° 2 »), 60 caractères au plus. */
  complement?: string;
  /** Bulletin corrigé : remplace le bulletin déjà en ligne pour ce mois. */
  remplacer?: boolean;
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

/** Précision nettoyée et titre recalculé à partir du type, de la période et de la précision. */
function normaliser<T extends MetaDocument>(m: T): T & { titre: string; complement: string } {
  const complement = (m.complement ?? "").trim().replace(/\s+/g, " ");
  const type = (m.typeDocument in TYPES_DOCUMENT ? m.typeDocument : "autre") as TypeDocument;
  return { ...m, complement, titre: titreDocument(type, m.periode.trim(), complement) };
}

/** Contrôles communs aux deux temps du dépôt ; renvoie un message d'erreur ou null. */
function controlerMeta(m: MetaDocument): string | null {
  if (!isUuid(m.compteId) || !isUuid(m.gestionId)) return "Identifiants invalides.";
  if (!(m.typeDocument in TYPES_DOCUMENT)) return "Type de document invalide.";
  if ((m.complement ?? "").trim().length > 60) return "La précision ne doit pas dépasser 60 caractères.";
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
    titre: (m.titre ?? "").trim(),
  });
}

/**
 * Premier temps du dépôt d'un PDF : vérifie les informations saisies et
 * les doublons AVANT l'envoi du fichier (on évite d'envoyer 10 Mo pour
 * rien), puis fournit au navigateur l'identifiant et le chemin lisible
 * sous lequel il doit ranger le fichier.
 */
export async function preparerDepot(meta: MetaDocument): Promise<ResultatPreparation> {
  const m = normaliser(meta);
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
    if (m.typeDocument === "bulletin" && d.type_document === "bulletin" && memePeriode && !m.remplacer) {
      return {
        ok: false,
        message:
          "Un bulletin de salaire existe déjà pour ce mois dans cette gestion. Pour le remplacer, supprimez d'abord l'ancien, puis déposez le nouveau.",
      };
    }
    if (
      !(m.remplacer && m.typeDocument === "bulletin") &&
      d.type_document === m.typeDocument &&
      memePeriode &&
      String(d.titre).trim().toLowerCase() === m.titre.trim().toLowerCase()
    ) {
      return {
        ok: false,
        message: "Ce document existe déjà pour cette gestion (même type, même période et même précision).",
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
  meta: MetaDocument & { documentId: string; storagePath: string; nomFichier: string },
): Promise<ResultatAction> {
  const m = normaliser(meta);
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

  // Bulletin corrigé : on remplace le fichier et la fiche du bulletin déjà
  // en ligne (même mois, même gestion) au lieu d'en créer un second, ce que
  // la règle « un seul bulletin par mois » interdirait.
  let ancienFichier: string | null = null;
  let remplacement = false;
  if (m.remplacer && m.typeDocument === "bulletin") {
    const { data: existant } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("gestion_id", m.gestionId)
      .eq("employeur_id", m.compteId)
      .eq("type_document", "bulletin")
      .eq("periode", periode)
      .maybeSingle();
    if (existant) {
      remplacement = true;
      ancienFichier = (existant.storage_path as string | null) ?? null;
      const { error: errMaj } = await supabase
        .from("documents")
        .update({
          titre: m.titre.trim(),
          complement: m.complement || null,
          storage_path: cheminAttendu,
          nom_fichier_origine: m.nomFichier.slice(0, 255),
          created_at: new Date().toISOString(),
          // Bulletin corrigé : il redevient « nouveau » pour l'abonné.
          consulte_le: null,
        })
        .eq("id", existant.id);
      if (errMaj) return echec(messageErreur(errMaj));
      if (ancienFichier && ancienFichier !== cheminAttendu) {
        await supprimerFichiers(supabase, [ancienFichier]);
      }
    }
  }

  const { error } = remplacement
    ? { error: null }
    : await supabase.from("documents").insert({
        id: m.documentId,
        gestion_id: m.gestionId,
        type_document: m.typeDocument,
        titre: m.titre.trim(),
        complement: m.complement || null,
        periode: periode || null,
        storage_path: cheminAttendu,
        nom_fichier_origine: m.nomFichier.slice(0, 255),
      });
  if (error) return echec(messageErreur(error));

  // Prévenir l'abonné sur ses appareils. Le message reste volontairement
  // général (pas de nom, pas de montant) : il peut s'afficher sur un écran
  // verrouillé.
  // Copie par email (sauf si l'abonné l'a désactivée) : on peut y nommer
  // le salarié, utile quand l'abonné en emploie plusieurs.
  const libelle = TYPES_DOCUMENT[m.typeDocument as TypeDocument] ?? "Document";
  const quoi = periode ? `${libelle} de ${libelleMois(periode)}` : libelle;
  const { data: g } = await supabase
    .from("gestions")
    .select("prenom_salarie, nom_salarie")
    .eq("id", m.gestionId)
    .maybeSingle();
  const salarie = g ? `${g.prenom_salarie ?? ""} ${g.nom_salarie ?? ""}`.trim() : "";
  const bilan = await prevenirAbonne(
    supabase,
    m.compteId,
    {
      title: remplacement ? "Bulletin corrigé disponible" : "Nouveau document disponible",
      body: quoi,
      url: `/tableau-de-bord/gestions/${m.gestionId}`,
      tag: `document-${m.documentId}`,
    },
    {
      sujet: `${remplacement ? "Bulletin corrigé disponible" : "Nouveau document disponible"} : ${quoi}`,
      titre: remplacement ? "Votre bulletin corrigé est disponible" : "Un nouveau document est disponible",
      paragraphes: [
        `${remplacement ? "Le bulletin corrigé" : "Un nouveau document"} est disponible dans votre espace Aide & Garde : ${quoi}${salarie ? ` (${salarie})` : ""}.`,
        "Pour protéger vos données, il n'est pas joint à cet email : téléchargez-le depuis votre espace sécurisé.",
      ],
      bouton: "Télécharger depuis mon espace",
    },
  );

  revalidatePath(`/admin/comptes/${m.compteId}`);
  return {
    ok: true,
    message: `${remplacement ? "Bulletin remplacé" : "Document déposé"} — ${bilan}.`,
  };
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

/** Brique 3 : gestion envoyée par l'abonné → en cours. */
export async function validerGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const gestionId = texte(fd, "gestion_id");
  const { data, error } = await supabase
    .from("gestions")
    .update({ statut: "en_cours", validee_le: new Date().toISOString(), motif_retour: null })
    .eq("id", gestionId)
    .eq("employeur_id", compteId)
    .eq("statut", "envoyee")
    .select("prenom_salarie, nom_salarie");
  if (error) retour(compteId, "erreur", messageErreur(error));
  if (!data?.length) retour(compteId, "erreur", "Cette gestion n'est plus en attente de validation.");

  const salarie = `${data[0].prenom_salarie ?? ""} ${data[0].nom_salarie ?? ""}`.trim();
  const bilan = await prevenirAbonne(
    supabase,
    compteId,
    {
      title: "Gestion validée",
      body: `La gestion de ${salarie} est en cours.`,
      url: `/tableau-de-bord/gestions/${gestionId}`,
      tag: `gestion-${gestionId}`,
    },
    {
      sujet: `Gestion validée : ${salarie}`,
      titre: "Votre gestion est validée",
      paragraphes: [
        `Aide & Garde a validé la gestion de ${salarie} : elle est désormais en cours.`,
        "Chaque mois, déclarez les heures travaillées depuis votre espace : nous établissons le bulletin et vous prévenons dès qu'il est disponible.",
      ],
      bouton: "Ouvrir la gestion",
    },
  );
  retour(compteId, "ok", `Gestion validée — ${bilan}.`);
}

/** Brique 3 : renvoyer une gestion envoyée à l'abonné pour qu'il la complète. */
export async function renvoyerGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const gestionId = texte(fd, "gestion_id");
  const motif = texte(fd, "motif_retour").slice(0, 2000);
  if (motif.length < 3) retour(compteId, "erreur", "Indiquez à l'abonné ce qu'il doit compléter.");

  const { data, error } = await supabase
    .from("gestions")
    .update({ statut: "brouillon", motif_retour: motif, envoyee_le: null })
    .eq("id", gestionId)
    .eq("employeur_id", compteId)
    .eq("statut", "envoyee")
    .select("prenom_salarie, nom_salarie");
  if (error) retour(compteId, "erreur", messageErreur(error));
  if (!data?.length) retour(compteId, "erreur", "Cette gestion n'est plus en attente de validation.");

  const salarie = `${data[0].prenom_salarie ?? ""} ${data[0].nom_salarie ?? ""}`.trim();
  const bilan = await prevenirAbonne(
    supabase,
    compteId,
    {
      title: "Gestion à compléter",
      body: `Il manque une information pour la gestion de ${salarie}.`,
      url: `/tableau-de-bord/gestions/${gestionId}`,
      tag: `gestion-${gestionId}`,
    },
    {
      sujet: `Gestion à compléter : ${salarie}`,
      titre: "Une information manque",
      paragraphes: [
        `Avant de démarrer la gestion de ${salarie}, nous avons besoin que vous complétiez la demande :`,
        `« ${motif} »`,
        "Modifiez la gestion dans votre espace, puis envoyez-la à nouveau.",
      ],
      bouton: "Compléter la gestion",
    },
  );
  retour(compteId, "ok", `Gestion renvoyée à l'abonné — ${bilan}.`);
}

/**
 * Brique 3b : clore une demande d'avenant sans dépôt de document (le dépôt
 * d'un document de type « Avenant » la clôt automatiquement).
 */
export async function marquerAvenantTraite(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const demandeId = texte(fd, "demande_id");
  const commentaire = texte(fd, "commentaire").slice(0, 2000);
  const { data, error } = await supabase
    .from("demandes_avenant")
    .update({
      statut: "traitee",
      traitee_le: new Date().toISOString(),
      ...(commentaire ? { reponse_admin: commentaire } : {}),
    })
    .eq("id", demandeId)
    .eq("employeur_id", compteId)
    .eq("statut", "envoyee")
    .select("gestion_id");
  if (error) retour(compteId, "erreur", messageErreur(error));
  if (!data?.length) retour(compteId, "erreur", "Cette demande est déjà traitée.");

  const gestionId = data[0].gestion_id as string;
  const bilan = await prevenirAbonne(
    supabase,
    compteId,
    {
      title: "Demande d'avenant traitée",
      body: "Votre demande de modification du contrat a été traitée.",
      url: `/tableau-de-bord/gestions/${gestionId}`,
      tag: `avenant-${demandeId}`,
    },
    {
      sujet: "Votre demande d'avenant a été traitée",
      titre: "Demande d'avenant traitée",
      paragraphes: [
        "Aide & Garde a traité votre demande de modification du contrat de travail.",
        ...(commentaire ? [`Notre réponse : « ${commentaire} »`] : []),
        "Retrouvez les informations à jour dans votre espace.",
      ],
      bouton: "Ouvrir la gestion",
    },
  );
  retour(compteId, "ok", `Demande d'avenant marquée comme traitée — ${bilan}.`);
}

/**
 * Clore une demande d'avenant SANS avenant (demande sans objet, réglée par
 * téléphone…), avec un commentaire facultatif pour l'abonné.
 */
export async function cloreAvenant(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const demandeId = texte(fd, "demande_id");
  const commentaire = texte(fd, "commentaire").slice(0, 2000);
  const { data, error } = await supabase
    .from("demandes_avenant")
    .update({
      statut: "close",
      traitee_le: new Date().toISOString(),
      reponse_admin: commentaire || null,
    })
    .eq("id", demandeId)
    .eq("employeur_id", compteId)
    .eq("statut", "envoyee")
    .select("gestion_id");
  if (error) {
    retour(
      compteId,
      "erreur",
      error.message.includes("statut_check") || error.message.includes("reponse_admin")
        ? "Exécutez d'abord le script supabase/brique7d_cloture_demandes.sql."
        : messageErreur(error),
    );
  }
  if (!data?.length) retour(compteId, "erreur", "Cette demande est déjà traitée.");

  const gestionId = data[0].gestion_id as string;
  const bilan = await prevenirAbonne(
    supabase,
    compteId,
    {
      title: "Réponse à votre demande d'avenant",
      body: commentaire ? commentaire.slice(0, 120) : "Aide & Garde a répondu à votre demande.",
      url: `/tableau-de-bord/gestions/${gestionId}`,
      tag: `avenant-${demandeId}`,
    },
    {
      sujet: "Réponse à votre demande d'avenant",
      titre: "Votre demande d'avenant est close",
      paragraphes: [
        "Aide & Garde a examiné votre demande de modification du contrat de travail : elle ne donne pas lieu à un avenant.",
        ...(commentaire ? [`Notre réponse : « ${commentaire} »`] : []),
        "Pour toute question, répondez simplement à cet email ou appelez-nous.",
      ],
      bouton: "Ouvrir la gestion",
    },
  );
  retour(compteId, "ok", `Demande d'avenant close — ${bilan}.`);
}

/**
 * Clore une déclaration du mois sans bulletin, ou refuser une demande de
 * modification de bulletin (le bulletin en ligne reste le bon), avec un
 * commentaire facultatif pour l'abonné.
 */
export async function cloreDeclaration(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const declarationId = texte(fd, "declaration_id");
  const commentaire = texte(fd, "commentaire").slice(0, 2000);
  if (!isUuid(declarationId)) retour(compteId, "erreur", "Demande introuvable.");

  const { data: decl } = await supabase
    .from("declarations_mensuelles")
    .select("gestion_id, periode, employeur_id")
    .eq("id", declarationId)
    .maybeSingle();
  if (!decl || decl.employeur_id !== compteId) retour(compteId, "erreur", "Demande introuvable.");

  const { data: avant, error } = await supabase.rpc("clore_declaration", {
    p_id: declarationId,
    p_commentaire: commentaire,
  });
  if (error) {
    retour(
      compteId,
      "erreur",
      error.message.includes("clore_declaration")
        ? "Exécutez d'abord le script supabase/brique7d_cloture_demandes.sql."
        : error.message,
    );
  }
  const refusModif = avant === "modification";
  const mois = libelleMois(decl.periode as string);
  const bilan = await prevenirAbonne(
    supabase,
    compteId,
    {
      title: refusModif ? `Bulletin de ${mois} : réponse` : `Déclaration de ${mois} close`,
      body: commentaire ? commentaire.slice(0, 120) : "Aide & Garde a répondu à votre demande.",
      url: `/tableau-de-bord/gestions/${decl.gestion_id}#declaration`,
      tag: `declaration-${declarationId}`,
    },
    {
      sujet: refusModif
        ? `Votre demande de modification du bulletin de ${mois}`
        : `Votre déclaration de ${mois}`,
      titre: refusModif ? "Réponse à votre demande de modification" : "Déclaration close",
      paragraphes: [
        refusModif
          ? `Aide & Garde a examiné votre demande de modification du bulletin de ${mois} : le bulletin en ligne est maintenu sans changement.`
          : `Aide & Garde a clos votre déclaration de ${mois} sans établir de bulletin.`,
        ...(commentaire ? [`Notre réponse : « ${commentaire} »`] : []),
        "Pour toute question, répondez simplement à cet email ou appelez-nous.",
      ],
      bouton: "Ouvrir la gestion",
    },
  );
  retour(
    compteId,
    "ok",
    `${refusModif ? "Demande de modification refusée" : "Déclaration close"} — ${bilan}.`,
  );
}

/** Mise à jour des informations du contrat par l'administrateur (avenant…). */
export async function modifierContratGestion(fd: FormData) {
  const { supabase, compteId } = await contexte(fd);
  const gestionId = texte(fd, "gestion_id");
  const nb = (nom: string): number | null => {
    const t = texte(fd, nom).replace(",", ".").replace(/\s/g, "");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const date = (nom: string): string | null => {
    const t = texte(fd, nom);
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  };
  const typeContrat = texte(fd, "type_contrat");
  const unite = texte(fd, "unite_heures");
  const { error } = await supabase
    .from("gestions")
    .update({
      type_contrat: typeContrat === "CDI" || typeContrat === "CDD" ? typeContrat : null,
      date_fin_prevue: typeContrat === "CDD" ? date("date_fin_prevue") : null,
      heures: nb("heures"),
      unite_heures: unite === "semaine" || unite === "mois" ? unite : null,
      salaire_horaire_net: nb("salaire_horaire_net"),
      precisions: texte(fd, "precisions").slice(0, 2000),
    })
    .eq("id", gestionId)
    .eq("employeur_id", compteId);
  if (error) retour(compteId, "erreur", messageErreur(error));
  retour(compteId, "ok", "Informations du contrat mises à jour.");
}
