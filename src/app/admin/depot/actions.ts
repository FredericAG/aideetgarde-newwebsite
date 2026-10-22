"use server";

import { requireAdmin } from "@/lib/auth";
import { libelleDocument, libelleMois, type TypeDocument } from "@/lib/data";
import { prevenirAbonne } from "@/lib/prevenir";

/** Gestion trouvée pour une référence AG lue dans un nom de fichier. */
export interface GestionDepot {
  reference: string;
  id: string;
  employeurId: string;
  employeurNom: string;
  employeurPrenom: string;
  salarieNom: string;
  salariePrenom: string;
  statut: string;
}

/** Document déjà en ligne dans l'une de ces gestions. */
export interface DocumentEnLigne {
  gestionId: string;
  type: string;
  periode: string | null;
  titre: string;
  empreinte: string | null;
  deposeLe: string;
  consulteLe: string | null;
}

function paquets<T>(liste: T[], taille = 150): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) r.push(liste.slice(i, i + taille));
  return r;
}

/**
 * Dépôt en masse, avant tout envoi : retrouve les gestions désignées par
 * les références lues dans les noms de fichiers, et les documents déjà en
 * ligne dans ces gestions (pour signaler les remplacements et les fichiers
 * déjà déposés à l'identique). Aucune écriture.
 */
export async function analyserDepot(
  references: string[],
): Promise<{ gestions: GestionDepot[]; documents: DocumentEnLigne[]; erreur?: string }> {
  const { supabase } = await requireAdmin("/admin/depot");
  const refs = [...new Set(references.map((r) => r.toUpperCase()).filter((r) => /^AG\d{5}$/.test(r)))].slice(0, 3000);
  if (!refs.length) return { gestions: [], documents: [] };

  const gestions: GestionDepot[] = [];
  for (const lot of paquets(refs)) {
    const { data, error } = await supabase
      .from("gestions")
      .select("id, reference, employeur_id, nom_salarie, prenom_salarie, statut, employeur:profiles(nom, prenom)")
      .in("reference", lot);
    if (error) return { gestions: [], documents: [], erreur: error.message };
    for (const g of data ?? []) {
      const e = (Array.isArray(g.employeur) ? g.employeur[0] : g.employeur) as { nom?: string; prenom?: string } | null;
      gestions.push({
        reference: String(g.reference),
        id: g.id as string,
        employeurId: g.employeur_id as string,
        employeurNom: e?.nom ?? "",
        employeurPrenom: e?.prenom ?? "",
        salarieNom: (g.nom_salarie as string) ?? "",
        salariePrenom: (g.prenom_salarie as string) ?? "",
        statut: g.statut as string,
      });
    }
  }

  const documents: DocumentEnLigne[] = [];
  for (const lot of paquets(gestions.map((g) => g.id))) {
    // select("*") : fonctionne aussi avant le script brique4 (sans empreinte).
    const { data, error } = await supabase.from("documents").select("*").in("gestion_id", lot);
    if (error) return { gestions, documents: [], erreur: error.message };
    for (const d of data ?? []) {
      documents.push({
        gestionId: d.gestion_id as string,
        type: d.type_document as string,
        periode: (d.periode as string | null) ?? null,
        titre: String(d.titre ?? ""),
        empreinte: (d.empreinte as string | null) ?? null,
        deposeLe: d.created_at as string,
        consulteLe: (d.consulte_le as string | null) ?? null,
      });
    }
  }
  return { gestions, documents };
}

export interface DepotReussi {
  compteId: string;
  gestionId: string;
  typeDocument: string;
  periode: string;
  complement: string;
  remplacement: boolean;
}

/**
 * Après un dépôt en masse : UNE notification (téléphone) et UN email par
 * abonné, qui récapitulent tous ses nouveaux documents, au lieu d'un
 * message par fichier. Renvoie un bilan par abonné.
 */
export async function notifierDepotGroupe(depots: DepotReussi[]): Promise<string[]> {
  const { supabase } = await requireAdmin("/admin/depot");
  const parCompte = new Map<string, DepotReussi[]>();
  for (const d of depots) {
    if (!parCompte.has(d.compteId)) parCompte.set(d.compteId, []);
    parCompte.get(d.compteId)!.push(d);
  }
  const ids = [...new Set(depots.map((d) => d.gestionId))];
  const salaries = new Map<string, string>();
  for (const lot of paquets(ids)) {
    const { data } = await supabase.from("gestions").select("id, prenom_salarie, nom_salarie").in("id", lot);
    for (const g of data ?? []) {
      salaries.set(g.id as string, `${g.prenom_salarie ?? ""} ${g.nom_salarie ?? ""}`.trim());
    }
  }

  const bilans: string[] = [];
  for (const [compteId, liste] of parCompte) {
    const lignes = liste.map((d) => {
      const libelle = libelleDocument({ type_document: d.typeDocument as TypeDocument, complement: d.complement || null });
      const quoi = d.periode ? `${libelle} de ${libelleMois(d.periode)}` : libelle;
      const s = salaries.get(d.gestionId);
      return `${quoi}${s ? ` (${s})` : ""}${d.remplacement ? ", version corrigée" : ""}`;
    });
    const n = liste.length;
    const titre = n === 1 ? (liste[0].remplacement ? "Document mis à jour" : "Nouveau document disponible") : `${n} nouveaux documents disponibles`;
    const bilan = await prevenirAbonne(
      supabase,
      compteId,
      {
        title: titre,
        body: n === 1 ? lignes[0].replace(/ \(.*\)/, "") : "Retrouvez-les dans votre espace Aide & Garde.",
        url: n === 1 ? `/tableau-de-bord/gestions/${liste[0].gestionId}` : "/tableau-de-bord/documents",
        tag: `depot-${compteId}-${Date.now()}`,
      },
      {
        sujet: titre,
        titre: n === 1 ? titre : "De nouveaux documents sont disponibles",
        paragraphes: [
          n === 1 ? `Un document est disponible dans votre espace Aide & Garde : ${lignes[0]}.` : "Ces documents sont disponibles dans votre espace Aide & Garde :",
          ...(n === 1 ? [] : lignes.map((l) => `• ${l}`)),
          "Pour protéger vos données, ils ne sont pas joints à cet email : téléchargez-les depuis votre espace sécurisé.",
        ],
        bouton: "Télécharger depuis mon espace",
      },
    );
    bilans.push(bilan);
  }
  return bilans;
}
