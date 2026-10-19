/**
 * Types et petites fonctions d'affichage pour le noyau de données de la
 * brique 2 (voir supabase/brique2.sql pour la définition des tables).
 */

export type TypeGestion = "garde_enfants" | "aide_domicile" | "employe_maison";
export type TypeDocument =
  | "bulletin"
  | "contrat"
  | "avenant"
  | "solde_tout_compte"
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

export const TYPES_DOCUMENT: Record<TypeDocument, string> = {
  bulletin: "Bulletin de salaire",
  contrat: "Contrat",
  avenant: "Avenant",
  solde_tout_compte: "Solde de tout compte",
  attestation: "Attestation",
  autre: "Autre",
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
