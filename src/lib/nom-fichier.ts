import { CODES_TYPES, CODE_DU_TYPE, TYPES_DOCUMENT, formatPeriode, type TypeDocument } from "@/lib/data";

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

  // Type. D'abord les codes repérables même collés à un nom
  // ("BOBOLABPG225"), puis les codes isolés ("DUPONT CT 01-2024"), puis
  // les mots en toutes lettres.
  let type: TypeDocument | null = null;
  const mots = base.split(/[^A-Z0-9]+/).filter(Boolean);
  if (base.includes("BPG")) type = "bulletin";
  else if (base.includes("ATTHON")) type = "attestation_honneur";
  else if (base.includes("STC")) type = "solde_tout_compte";
  else {
    const code = mots.find((m) => m in CODES_TYPES);
    if (code) type = CODES_TYPES[code];
    else if (/BULLETIN/.test(base)) type = "bulletin";
    else if (/SOLDE/.test(base)) type = "solde_tout_compte";
    else if (/CERTIFICAT/.test(base)) type = "certificat_travail";
    else if (/FRANCE ?TRAVAIL|POLE ?EMPLOI/.test(base)) type = "attestation_france_travail";
    else if (/HONNEUR/.test(base)) type = "attestation_honneur";
    else if (/AVENANT/.test(base)) type = "avenant";
    else if (/CONTRAT/.test(base)) type = "contrat";
    else if (/LICENCIEMENT/.test(base)) type = "licenciement";
    else if (/RUPTURE/.test(base)) type = "rupture_conventionnelle";
    else if (/ATTESTATION/.test(base)) type = "attestation";
  }

  return { type, periode };
}

/**
 * Titre enregistré d'un document (norme du 21/10) : type, période et
 * précision éventuelle, ex. « Courrier / lettre 03/2026 — Démission ». Il
 * sert aux contrôles de doublons et au stockage ; l'abonné voit le type,
 * la précision et la période dans des colonnes séparées.
 */
export function titreDocument(type: TypeDocument, periode: string | null, complement?: string | null): string {
  const base = titreParDefaut(type, periode || null);
  return complement ? `${base} — ${complement}` : base;
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

/** Élément d'un nom de fichier normé : majuscules sans accents, sans « _ ». */
function elementNorme(texte: string | null | undefined): string {
  return (texte ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nom du fichier téléchargé par l'abonné (norme du 21/10, sans la
 * référence de gestion réservée à l'administration) :
 * `DUPONT_MARTIN_BP_2605.pdf`, `DUPONT_MARTIN_LET_2603_DEMISSION.pdf`.
 */
export function nomTelechargement(p: {
  employeur: string;
  salarie: string;
  type: TypeDocument;
  periode: string | null;
  complement?: string | null;
}): string {
  const elements = [
    elementNorme(p.employeur),
    elementNorme(p.salarie),
    CODE_DU_TYPE[p.type] ?? "DOC",
    p.periode ?? "",
    elementNorme(p.complement),
  ].filter(Boolean);
  return `${elements.join("_").slice(0, 150)}.pdf`;
}
