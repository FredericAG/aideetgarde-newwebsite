/**
 * Types et petites fonctions d'affichage pour le noyau de données de la
 * brique 2 (voir supabase/brique2.sql pour la définition des tables).
 */

export type TypeGestion = "garde_enfants" | "aide_domicile" | "employe_maison" | "environnement_technique" | "environnement_externe";
export type TypeDocument =
  | "bulletin"
  | "contrat"
  | "avenant"
  | "certificat_travail"
  | "solde_tout_compte"
  | "attestation_france_travail"
  | "attestation_salaire"
  | "attestation_employeur"
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
  // Brique 5a (absents tant que le script n'a pas été exécuté).
  mode_paiement?: "manuel" | "systempay";
  carte_masquee?: string | null;
  carte_expiration?: string | null;
  prochaine_echeance?: string | null;
  statut_paiement?: "a_jour" | "en_retard" | "impaye";
  // Brique 5b : résiliation demandée par l'abonné (effet fin du mois civil).
  resiliation_demandee_le?: string | null;
  fin_prevue?: string | null;
}

export interface Gestion {
  id: string;
  employeur_id: string;
  abonnement_id: string;
  reference: string;
  type_gestion: TypeGestion;
  prenom_salarie: string;
  nom_salarie: string;
  statut: StatutGestion;
  date_debut: string;
  date_fin: string | null;
  // Informations du contrat saisies par l'abonné (brique 3). Facultatives
  // dans le type : absentes tant que le script brique3 n'a pas été exécuté.
  type_contrat?: "CDI" | "CDD" | null;
  date_fin_prevue?: string | null;
  heures?: number | null;
  unite_heures?: "semaine" | "mois" | null;
  salaire_horaire_net?: number | null;
  precisions?: string;
  envoyee_le?: string | null;
  validee_le?: string | null;
  /** Ce que l'administrateur demande de compléter (gestion renvoyée). */
  motif_retour?: string | null;
  /** CDD de remplacement (brique 3d) : gestion du salarié absent, hors quota. */
  remplace_gestion_id?: string | null;
  motif_remplacement?: MotifRemplacement | null;
  /** Coordonnées pour les courriers préremplis (brique 3e). */
  civilite_salarie?: Civilite;
  adresse_salarie?: string;
  code_postal_salarie?: string;
  ville_salarie?: string;
  /**
   * Premier mois à déclarer, fixé par l'administrateur pour un abonné repris
   * en cours de contrat (brique 3e). null : depuis le début du contrat.
   */
  declarations_depuis?: string | null;
  /**
   * Champs complémentaires du contrat (brique 3f), décrits dans
   * src/lib/contrat/champs.ts.
   */
  config?: Record<string, string> | null;
}

export type Civilite = "" | "Madame" | "Monsieur";

// ---------------------------------------------------------------------------
// Événements signalés à Aide & Garde (brique 3e)
// ---------------------------------------------------------------------------

export type TypeSignalement = "fin_contrat" | "accident_travail" | "arret_maladie" | "conge_maternite";
export type ModeFinContrat = "licenciement" | "rupture_conventionnelle" | "demission" | "retraite";

export const TYPES_SIGNALEMENT: Record<TypeSignalement, string> = {
  fin_contrat: "Fin de contrat",
  accident_travail: "Accident du travail",
  arret_maladie: "Arrêt maladie",
  conge_maternite: "Congé maternité",
};

export const MODES_FIN_CONTRAT: Record<ModeFinContrat, string> = {
  licenciement: "Licenciement",
  rupture_conventionnelle: "Rupture conventionnelle",
  demission: "Démission",
  retraite: "Départ à la retraite",
};

/** Libellé de la date demandée selon le signalement. */
export const DATES_SIGNALEMENT: Record<TypeSignalement, string> = {
  fin_contrat: "Dernier jour du contrat (prévu)",
  accident_travail: "Date de l'accident",
  arret_maladie: "Premier jour d'arrêt",
  conge_maternite: "Début du congé maternité",
};

export interface Signalement {
  id: string;
  gestion_id: string;
  employeur_id: string;
  type: TypeSignalement;
  precision: ModeFinContrat | "";
  date_evenement: string | null;
  commentaire: string;
  statut: "envoyee" | "traitee";
  created_at: string;
  traitee_le: string | null;
  reponse_admin: string | null;
}

export function libelleSignalement(s: Pick<Signalement, "type" | "precision">): string {
  if (s.type === "fin_contrat" && s.precision) return `${TYPES_SIGNALEMENT.fin_contrat} : ${MODES_FIN_CONTRAT[s.precision].toLowerCase()}`;
  return TYPES_SIGNALEMENT[s.type];
}

export type MotifRemplacement = "conge_maternite" | "arret_maladie";

export const MOTIFS_REMPLACEMENT: Record<MotifRemplacement, string> = {
  conge_maternite: "congé maternité",
  arret_maladie: "arrêt maladie",
};

/**
 * Cycle de vie d'une gestion (brique 3) :
 * brouillon → envoyee → en_cours → terminee (voir brique3_gestions_abonne.sql).
 */
export type StatutGestion = "brouillon" | "envoyee" | "en_cours" | "terminee";

export const LIBELLES_STATUT_GESTION: Record<StatutGestion, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée, en attente de validation",
  en_cours: "En cours",
  terminee: "Terminée",
};

/** Demande d'avenant d'un abonné sur une gestion en cours (brique 3b). */
export type ObjetAvenant =
  | "garde_partagee"
  | "organisation"
  | "adresse"
  | "taux_horaire"
  | "duree_travail"
  | "autre";

export const OBJETS_AVENANT: Record<ObjetAvenant, string> = {
  garde_partagee: "Passage en garde partagée (ou fin de garde partagée)",
  organisation: "Changement d'organisation ou d'horaires",
  duree_travail: "Changement de durée de travail",
  taux_horaire: "Changement de taux horaire",
  adresse: "Changement d'adresse (lieu de travail)",
  autre: "Autre changement",
};

export interface DemandeAvenant {
  id: string;
  gestion_id: string;
  employeur_id: string;
  objets: ObjetAvenant[];
  date_effet: string | null;
  description: string;
  statut: "envoyee" | "traitee" | "close";
  created_at: string;
  traitee_le: string | null;
  /** Brique 7d : commentaire de l'administration à la clôture. */
  reponse_admin?: string | null;
}

/** « 20 h par semaine », « 86,67 h par mois ». */
export function formatDuree(g: Pick<Gestion, "heures" | "unite_heures">): string {
  if (g.heures == null || !g.unite_heures) return "—";
  return `${String(g.heures).replace(".", ",")} h par ${g.unite_heures}`;
}

/** 12.5 → « 12,50 € net / heure ». */
export function formatSalaireHoraire(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Number(v).toFixed(2).replace(".", ",")} € net / heure`;
}

export interface DocumentRow {
  id: string;
  gestion_id: string;
  type_document: TypeDocument;
  periode: string | null;
  titre: string;
  /** Précision facultative (« Démission », « n° 2 »), script brique2h. */
  complement?: string | null;
  storage_path: string | null;
  created_at: string;
  /** Premier téléchargement par l'abonné ; vide = document « nouveau ». */
  consulte_le?: string | null;
}

/** Nom de l'espace de stockage Supabase des PDF (voir brique2c_stockage_pdf.sql). */
export const BUCKET = "documents";

/** Taille maximale d'un PDF déposé (doit rester cohérente avec le script SQL). */
export const TAILLE_MAX_PDF = 20 * 1024 * 1024;

export const TYPES_GESTION: Record<TypeGestion, string> = {
  garde_enfants: "Garde d'enfants",
  aide_domicile: "Aide à domicile",
  employe_maison: "Employé familial",
  environnement_technique: "Cours, secrétariat, informatique",
  environnement_externe: "Jardinage, petits travaux",
};

/**
 * Types de documents (ordre d'affichage des listes de choix).
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
  attestation_employeur: "Attestation employeur",
  attestation_honneur: "Attestation sur l'honneur",
  licenciement: "Procédure de licenciement",
  rupture_conventionnelle: "Rupture conventionnelle",
  courrier: "Courrier / lettre",
  attestation: "Autre attestation",
  autre: "Autre",
};

/**
 * Regroupement des documents en trois catégories (affichage administrateur,
 * à étendre à l'abonné). Les documents de fin de contrat (certificat de
 * travail, solde de tout compte, attestation France Travail) sont rangés
 * avec les éléments contractuels : ils concernent la vie du contrat.
 */
export type CategorieDocument = "contractuel" | "bulletin" | "autre";

export const CATEGORIES_DOCUMENT: { cle: CategorieDocument; titre: string; aide: string }[] = [
  {
    cle: "contractuel",
    titre: "Éléments contractuels",
    aide: "Contrat, avenants, rupture et documents de fin de contrat",
  },
  { cle: "bulletin", titre: "Bulletins de paie", aide: "Un bulletin par mois" },
  { cle: "autre", titre: "Autres documents", aide: "Attestations, courriers, divers" },
];

const TYPES_CONTRACTUELS: TypeDocument[] = [
  "contrat",
  "avenant",
  "rupture_conventionnelle",
  "licenciement",
  "certificat_travail",
  "solde_tout_compte",
  "attestation_france_travail",
];

export function categorieDocument(type: TypeDocument): CategorieDocument {
  if (type === "bulletin") return "bulletin";
  return TYPES_CONTRACTUELS.includes(type) ? "contractuel" : "autre";
}

/**
 * Codes de type utilisés dans les noms de fichiers. Les six premiers sont
 * ceux déjà employés par Frédéric ; les suivants sont des propositions à
 * valider (dépôt en masse, brique 4).
 */
export const CODES_TYPES: Record<string, TypeDocument> = {
  // Norme du 21/10 : BP pour les bulletins. BPG reste reconnu (fichiers
  // actuels, reprise de l'ancien site).
  BP: "bulletin",
  BPG: "bulletin",
  STC: "solde_tout_compte",
  CT: "certificat_travail",
  FT: "attestation_france_travail",
  AS: "attestation_salaire",
  ATTHON: "attestation_honneur",
  AE: "attestation_employeur",
  CTRA: "contrat",
  AV: "avenant",
  LIC: "licenciement",
  RUPT: "rupture_conventionnelle",
  LET: "courrier",
  // Anciens codes, reconnus pour la reprise : APE = attestation Pôle emploi.
  APE: "attestation_france_travail",
};

/** Code de chaque type dans les noms de fichiers (norme du 21/10). */
export const CODE_DU_TYPE: Record<TypeDocument, string> = {
  bulletin: "BP",
  contrat: "CTRA",
  avenant: "AV",
  certificat_travail: "CT",
  solde_tout_compte: "STC",
  attestation_france_travail: "FT",
  attestation_salaire: "AS",
  attestation_employeur: "AE",
  attestation_honneur: "ATTHON",
  licenciement: "LIC",
  rupture_conventionnelle: "RUPT",
  courrier: "LET",
  attestation: "ATT",
  autre: "DOC",
};

/**
 * Libellé d'un document dans les listes : son type, suivi de la précision
 * éventuelle (« Courrier / lettre — Démission »). La période est affichée à
 * part ; le nom de l'employeur et du salarié ne sont jamais répétés.
 */
export function libelleDocument(d: Pick<DocumentRow, "type_document" | "complement">): string {
  const type = TYPES_DOCUMENT[d.type_document] ?? "Document";
  return d.complement ? `${type} — ${d.complement}` : type;
}

/** Libellé et période sur une ligne, pour les infobulles et la lecture vocale. */
export function intituleDocument(d: Pick<DocumentRow, "type_document" | "complement" | "periode">): string {
  return `${libelleDocument(d)}${d.periode ? ` ${formatPeriode(d.periode)}` : ""}`;
}

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

/**
 * Tris proposés par les flèches des en-têtes de colonnes (retour du 27/10) :
 * Document (A→Z / Z→A), Période (récent / ancien), Mis en ligne le.
 */
export type TriDocuments = "recent" | "ancien" | "alpha" | "alpha_inverse" | "depot_recent" | "depot_ancien";

export const LIBELLES_TRI: Record<TriDocuments, string> = {
  recent: "Période, plus récents d'abord",
  ancien: "Période, plus anciens d'abord",
  alpha: "Document, de A à Z",
  alpha_inverse: "Document, de Z à A",
  depot_recent: "Mise en ligne, plus récents d'abord",
  depot_ancien: "Mise en ligne, plus anciens d'abord",
};

/** Clé de date d'un document : sa période AAMM si elle existe, sinon sa date de dépôt. */
function cleDate(d: Pick<DocumentRow, "periode" | "created_at">): string {
  return d.periode ? `20${d.periode}` : d.created_at.slice(0, 7).replace("-", "");
}

/** Trie une liste de documents (copie) selon le critère choisi par l'utilisateur. */
export function trierDocuments<T extends DocumentRow>(docs: T[], tri: TriDocuments): T[] {
  const recent = (a: T, b: T) =>
    cleDate(b).localeCompare(cleDate(a)) || b.created_at.localeCompare(a.created_at);
  const copie = [...docs];
  switch (tri) {
    case "ancien":
      return copie.sort((a, b) => -recent(a, b));
    case "alpha":
    case "alpha_inverse": {
      // Ordre de l'intitulé affiché (type et précision), puis le plus récent.
      const sens = tri === "alpha" ? 1 : -1;
      return copie.sort(
        (a, b) => sens * libelleDocument(a).localeCompare(libelleDocument(b), "fr", { sensitivity: "base" }) || recent(a, b),
      );
    }
    case "depot_recent":
      return copie.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "depot_ancien":
      return copie.sort((a, b) => a.created_at.localeCompare(b.created_at));
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
  statut: "envoyee" | "traitee" | "modification" | "close";
  envoyee_le: string;
  traitee_le: string | null;
  motif_modification?: string | null;
  modification_demandee_le?: string | null;
  /** Brique 7d : réponse de l'administration quand elle clôt la demande. */
  reponse_admin?: string | null;
  cloturee_le?: string | null;
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
 * Mois du mois de début au mois de fin (inclus), au format AAMM, du plus
 * récent au plus ancien.
 */
function moisEntre(debut: Date, fin: Date): string[] {
  const liste: string[] = [];
  const d = new Date(fin.getFullYear(), fin.getMonth(), 1);
  const limite = new Date(debut.getFullYear(), debut.getMonth(), 1);
  while (d >= limite && liste.length < 240) {
    liste.push(aamm(d));
    d.setMonth(d.getMonth() - 1);
  }
  return liste;
}

function dateLocale(iso: string): Date {
  const [y, m, j] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, j);
}

/** Mois en cours, au format AAMM. */
export function moisCourant(aujourdhui = new Date()): string {
  return aamm(aujourdhui);
}

/**
 * Mois que l'abonné peut déclarer (demande du 24/10/2026) : tous les mois
 * depuis le début du contrat (ou depuis le premier mois fixé par
 * l'administrateur) jusqu'au mois en cours, sauf ceux dont le bulletin est
 * en ligne et ceux qu'Aide & Garde a clos sans bulletin. Du plus récent au
 * plus ancien.
 *
 * Mois sélectionné par défaut : le mois précédent jusqu'au 10 (période
 * habituelle de déclaration du mois écoulé), le mois en cours ensuite ; à
 * défaut, le plus récent de la liste.
 */
export function periodesADeclarer(
  gestion: Pick<Gestion, "date_debut" | "date_fin" | "declarations_depuis">,
  exclus: Set<string>,
  aujourdhui = new Date(),
): { options: { valeur: string; libelle: string }[]; parDefaut: string } {
  const debut = [gestion.date_debut, gestion.declarations_depuis]
    .filter((x): x is string => Boolean(x))
    .map(dateLocale)
    .reduce((a, b) => (b > a ? b : a), new Date(2000, 0, 1));
  const fin = gestion.date_fin && dateLocale(gestion.date_fin) < aujourdhui ? dateLocale(gestion.date_fin) : aujourdhui;
  const options = moisEntre(debut, fin)
    .filter((m) => !exclus.has(m))
    .map((valeur) => ({ valeur, libelle: libelleMois(valeur) }));
  const precedent = aamm(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1));
  const prefere = aujourdhui.getDate() <= 10 ? precedent : aamm(aujourdhui);
  const parDefaut = options.find((o) => o.valeur === prefere)?.valeur ?? options[0]?.valeur ?? "";
  return { options, parDefaut };
}

/**
 * Mois sélectionné par défaut pour déclarer (tableau de bord) : le mois
 * précédent jusqu'au 10, le mois en cours ensuite.
 */
export function moisADeclarerParDefaut(aujourdhui = new Date()): string {
  return aujourdhui.getDate() <= 10
    ? aamm(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1))
    : aamm(aujourdhui);
}

/**
 * Ancienneté en mois révolus entre deux dates ISO (début du contrat → date
 * de référence), pour la durée du préavis.
 */
export function ancienneteMois(debutIso: string, referenceIso: string): number {
  const d = dateLocale(debutIso);
  const r = dateLocale(referenceIso);
  let mois = (r.getFullYear() - d.getFullYear()) * 12 + (r.getMonth() - d.getMonth());
  if (r.getDate() < d.getDate()) mois -= 1;
  return Math.max(0, mois);
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
