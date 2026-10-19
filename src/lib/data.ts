/**
 * Types et petites fonctions d'affichage pour le noyau de données de la
 * brique 2 (voir supabase/brique2.sql pour la définition des tables).
 */

export type TypeGestion = "garde_enfants" | "aide_domicile" | "employe_maison";
export type TypeDocument =
  | "bulletin"
  | "contrat"
  | "avenant"
  | "certificat_travail"
  | "solde_tout_compte"
  | "attestation_france_travail"
  | "attestation_salaire"
  | "attestation_honneur"
  | "licenciement"
  | "rupture_conventionnelle"
  | "courrier"
  | "attestation"
  | "autre";

export interface Abonnement {
  id: string;
  employeur_id: string;
  statut: "actif" | "resilie";
  quota_gestions: number;
  tarif_mensuel: number;
  date_debut: string;
  date_fin: string | null;
  motif_fin: string | null;
}

export interface Gestion {
  id: string;
  employeur_id: string;
  abonnement_id: string;
  reference: string;
  type_gestion: TypeGestion;
  prenom_salarie: string;
  nom_salarie: string;
  statut: "en_cours" | "terminee";
  date_debut: string;
  date_fin: string | null;
}

export interface DocumentRow {
  id: string;
  gestion_id: string;
  type_document: TypeDocument;
  periode: string | null;
  titre: string;
  storage_path: string | null;
  created_at: string;
}

/** Nom de l'espace de stockage Supabase des PDF (voir brique2c_stockage_pdf.sql). */
export const BUCKET = "documents";

/** Taille maximale d'un PDF déposé (doit rester cohérente avec le script SQL). */
export const TAILLE_MAX_PDF = 20 * 1024 * 1024;

export const TYPES_GESTION: Record<TypeGestion, string> = {
  garde_enfants: "Garde d'enfants",
  aide_domicile: "Aide à domicile",
  employe_maison: "Employé de maison",
};

/**
 * Types de documents, dans l'ordre utilisé pour le tri « Par type ».
 * Les clés sont enregistrées en base (voir les scripts supabase/) : ne pas
 * les renommer, seulement les libellés.
 */
export const TYPES_DOCUMENT: Record<TypeDocument, string> = {
  bulletin: "Bulletin de salaire",
  contrat: "Contrat de travail",
  avenant: "Avenant",
  certificat_travail: "Certificat de travail",
  solde_tout_compte: "Solde de tout compte",
  attestation_france_travail: "Attestation France Travail",
  attestation_salaire: "Attestation de salaire",
  attestation_honneur: "Attestation sur l'honneur",
  licenciement: "Courrier de licenciement",
  rupture_conventionnelle: "Rupture conventionnelle",
  courrier: "Courrier / lettre",
  attestation: "Autre attestation",
  autre: "Autre",
};

/**
 * Codes de type utilisés dans les noms de fichiers. Les six premiers sont
 * ceux déjà employés par Frédéric ; les suivants sont des propositions à
 * valider (dépôt en masse, brique 4).
 */
export const CODES_TYPES: Record<string, TypeDocument> = {
  BPG: "bulletin",
  STC: "solde_tout_compte",
  CT: "certificat_travail",
  FT: "attestation_france_travail",
  AS: "attestation_salaire",
  ATTHON: "attestation_honneur",
  // Propositions, à valider :
  CTRA: "contrat",
  AV: "avenant",
  LIC: "licenciement",
  RUPT: "rupture_conventionnelle",
  LET: "courrier",
};

/** "2026-10-15" → "15/10/2026" (sans passer par Date : pas de décalage de fuseau). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "2609" (AAMM) → "09/2026". */
export function formatPeriode(aamm: string | null | undefined): string {
  if (!aamm || aamm.length !== 4) return "";
  return `${aamm.slice(2)}/20${aamm.slice(0, 2)}`;
}

export function formatEuros(n: number): string {
  return `${Number(n).toFixed(2).replace(".", ",")} €`;
}

export function nomSalarie(g: Pick<Gestion, "prenom_salarie" | "nom_salarie">) {
  return `${g.prenom_salarie} ${g.nom_salarie}`.trim();
}

/** Garde-fou simple contre les identifiants fantaisistes dans l'URL. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export type TriDocuments = "recent" | "ancien" | "alpha" | "type";

export const LIBELLES_TRI: Record<TriDocuments, string> = {
  recent: "Plus récents",
  ancien: "Plus anciens",
  alpha: "Ordre alphabétique",
  type: "Par type",
};

/** Clé de date d'un document : sa période AAMM si elle existe, sinon sa date de dépôt. */
function cleDate(d: Pick<DocumentRow, "periode" | "created_at">): string {
  return d.periode ? `20${d.periode}` : d.created_at.slice(0, 7).replace("-", "");
}

/** Trie une liste de documents (copie) selon le critère choisi par l'utilisateur. */
export function trierDocuments<T extends DocumentRow>(docs: T[], tri: TriDocuments): T[] {
  const ordreTypes = Object.keys(TYPES_DOCUMENT);
  const recent = (a: T, b: T) =>
    cleDate(b).localeCompare(cleDate(a)) || b.created_at.localeCompare(a.created_at);
  const copie = [...docs];
  switch (tri) {
    case "ancien":
      return copie.sort((a, b) => -recent(a, b));
    case "alpha":
      return copie.sort((a, b) => a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" }));
    case "type":
      return copie.sort(
        (a, b) =>
          ordreTypes.indexOf(a.type_document) - ordreTypes.indexOf(b.type_document) || recent(a, b),
      );
    default:
      return copie.sort(recent);
  }
}

// ---------------------------------------------------------------------------
// Déclarations mensuelles (brique 7a, voir supabase/brique7a_...sql)
// ---------------------------------------------------------------------------

export interface Declaration {
  id: string;
  gestion_id: string;
  periode: string; // AAMM
  heures: number | null;
  commentaire: string;
  statut: "envoyee" | "traitee";
  envoyee_le: string;
  traitee_le: string | null;
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** "2610" → "octobre 2026" */
export function libelleMois(aamm: string): string {
  const mois = Number(aamm.slice(2, 4));
  return `${MOIS[mois - 1] ?? "?"} 20${aamm.slice(0, 2)}`;
}

function aamm(date: Date): string {
  return `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Mois proposés à la déclaration : le mois en cours et les deux précédents.
 * Mois sélectionné par défaut : le mois précédent jusqu'au 10 (période
 * habituelle de déclaration du mois écoulé), le mois en cours ensuite.
 */
export function periodesDeclarables(aujourdhui = new Date()): {
  options: { valeur: string; libelle: string }[];
  parDefaut: string;
} {
  const options = [0, 1, 2].map((decalage) => {
    const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - decalage, 1);
    const valeur = aamm(d);
    return { valeur, libelle: libelleMois(valeur) };
  });
  const parDefaut = aujourdhui.getDate() <= 10 ? options[1].valeur : options[0].valeur;
  return { options, parDefaut };
}

/** "151,5" ou "151.5" → 151.5 ; vide → null ; invalide → NaN */
export function lireHeures(texte: string): number | null {
  const t = texte.trim().replace(",", ".");
  if (!t) return null;
  return /^\d{1,3}(\.\d{1,2})?$/.test(t) ? Number(t) : Number.NaN;
}

export function formatHeures(h: number | null): string {
  if (h === null || h === undefined) return "—";
  return `${String(Number(h)).replace(".", ",")} h`;
}
