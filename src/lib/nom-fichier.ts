import { TYPES_DOCUMENT, formatPeriode, type TypeDocument } from "@/lib/data";

/**
 * Outils autour des noms de fichiers des documents.
 *
 * 1. `analyserNomFichier` : devine le type et la période d'un PDF à partir
 *    de son nom, pour préremplir le formulaire de dépôt. C'est une première
 *    version volontairement prudente, calée sur les noms actuels (ex.
 *    "LHOPITALLIERKOT BOBOLABPG225 - 05-2022.pdf"). Elle sera remplacée par
 *    la convention de nommage stricte du dépôt en masse (brique 4).
 * 2. `cheminStockage` : construit le chemin lisible du fichier dans le
 *    stockage Supabase.
 */

export interface AnalyseNomFichier {
  type: TypeDocument | null;
  periode: string | null; // AAMM
}

export function analyserNomFichier(nom: string): AnalyseNomFichier {
  const base = nom.replace(/\.pdf$/i, "").toUpperCase();

  // Période : "05-2022", "05_2022", "05.2022", "05/2022" → 2205
  let periode: string | null = null;
  const moisAnnee = base.match(/(?:^|[^0-9])(0[1-9]|1[0-2])[-_./ ](20\d{2})(?![0-9])/);
  if (moisAnnee) {
    periode = `${moisAnnee[2].slice(2)}${moisAnnee[1]}`;
  } else {
    // "2022-05" → 2205
    const anneeMois = base.match(/(?:^|[^0-9])(20\d{2})[-_./ ](0[1-9]|1[0-2])(?![0-9])/);
    if (anneeMois) periode = `${anneeMois[1].slice(2)}${anneeMois[2]}`;
  }

  // Type : codes repérables même collés à un nom ("BOBOLABPG225").
  let type: TypeDocument | null = null;
  if (/BPG|BULLETIN/.test(base)) type = "bulletin";
  else if (/STC|SOLDE/.test(base)) type = "solde_tout_compte";
  else if (/AVENANT|(?:^|[^A-Z])AV(?:[^A-Z]|$)/.test(base)) type = "avenant";
  else if (/CONTRAT|(?:^|[^A-Z])CT(?:[^A-Z]|$)/.test(base)) type = "contrat";
  else if (/ATTESTATION|(?:^|[^A-Z])ATT(?:[^A-Z]|$)/.test(base)) type = "attestation";

  return { type, periode };
}

/** Titre proposé : "Bulletin de salaire 05/2022". */
export function titreParDefaut(type: TypeDocument, periode: string | null): string {
  return periode ? `${TYPES_DOCUMENT[type]} ${formatPeriode(periode)}` : TYPES_DOCUMENT[type];
}

/** "Zydownik Frédéric" → "zydownik-frederic" (ASCII, sans espaces). */
export function slug(texte: string, max = 40): string {
  const s = texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return s || "sans-nom";
}

/**
 * Chemin d'un fichier dans le stockage, lisible dans la console Supabase :
 *   <nom-employeur>_<id employeur>/<nom-salarie>_<id gestion>/<AAMM>_<type>_<titre>__<id document>.pdf
 * Les identifiants garantissent l'unicité et la sécurité ; les noms ne
 * servent qu'à s'y retrouver.
 */
export function cheminStockage(p: {
  employeur: { id: string; nom: string; prenom: string };
  gestion: { id: string; nom_salarie: string; prenom_salarie: string };
  documentId: string;
  type: string;
  periode: string;
  titre: string;
}): string {
  const dossierEmployeur = `${slug(`${p.employeur.nom} ${p.employeur.prenom}`)}_${p.employeur.id}`;
  const dossierGestion = `${slug(`${p.gestion.nom_salarie} ${p.gestion.prenom_salarie}`)}_${p.gestion.id}`;
  const fichier = `${p.periode || "sans-periode"}_${slug(p.type, 20)}_${slug(p.titre, 50)}__${p.documentId}.pdf`;
  return `${dossierEmployeur}/${dossierGestion}/${fichier}`;
}
