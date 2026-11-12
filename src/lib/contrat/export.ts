import { LIBELLES_STATUT_GESTION, MOTIFS_REMPLACEMENT, type Gestion } from "@/lib/data";
import { CHAMPS, JOURS_SEMAINE, lireEnfants, lirePlanning, optionsDe, type ChampContrat, type CleEtape, type ContexteChamps } from "./champs";
import { categorie, categorieDeLaGestion, echelleEnRomain, emploiRepere } from "./classification";

/**
 * Export d'une gestion pour le logiciel de paie (demandes des 07 et
 * 12/11/2026) : un fichier CSV, une ligne de titres et une ligne de valeurs,
 * avec un NOMBRE DE COLONNES FIGÉ. Toutes les colonnes sont toujours
 * présentes, dans le même ordre, vides quand l'information ne s'applique pas.
 *
 * Ordre : la gestion et le compte de l'employeur, puis LE SENS DU FORMULAIRE
 * (emploi, salarié, poste, contrat, horaires, salaire, envoi).
 * Titres : les clés techniques (stables, elles ne changent pas quand un
 * libellé du formulaire est reformulé).
 * Valeurs : les LIBELLÉS affichés à l'abonné (« Convention collective
 * (conseillé) », « Oui »…), dates JJ/MM/AAAA, heures HH:MM, nombres à
 * virgule.
 *
 * Ajouter un champ au formulaire ajoute une colonne à la fin de son étape :
 * prévenir l'administrateur pour qu'il mette à jour l'import de son logiciel.
 */

/** Employeur (compte de l'abonné). */
export interface EmployeurExport {
  reference_client?: string | null;
  civilite?: string | null;
  prenom?: string | null;
  nom?: string | null;
  date_naissance?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
}

/** Le formulaire accepte 4 enfants au plus (lireEnfants). */
const NB_ENFANTS = 4;

function dateFr(v: string | null | undefined): string {
  const t = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}` : t;
}

function nombreFr(v: string | number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v).replace(".", ",");
}

interface Donnees {
  g: Gestion;
  e: EmployeurExport;
  /** Valeurs du formulaire (config + colonnes de la gestion). */
  v: Record<string, string>;
  c: ContexteChamps;
}
type Colonne = [titre: string, valeur: (d: Donnees) => string];

/** Valeur d'un champ du formulaire, telle que l'abonné la lit. */
function libelleValeur(ch: ChampContrat, val: string, c: ContexteChamps): string {
  if (!val) return "";
  if (ch.type === "date") return dateFr(val);
  if (ch.type === "nombre" || ch.type === "montant") return nombreFr(val);
  if (ch.type === "oui_non") return val === "oui" ? "Oui" : val === "non" ? "Non" : val;
  if (ch.type === "choix") return optionsDe(ch, c).find((o) => o.valeur === val)?.libelle ?? val;
  if (ch.type === "multi") {
    const options = optionsDe(ch, c);
    return val
      .split("|")
      .filter(Boolean)
      .map((x) => options.find((o) => o.valeur === x)?.libelle ?? x)
      .join(", ");
  }
  return val;
}

/** Colonnes des champs d'une étape du formulaire, enfants et horaires par jour dépliés. */
function champsDeLEtape(etape: CleEtape): Colonne[] {
  const cols: Colonne[] = [];
  for (const ch of CHAMPS.filter((x) => x.etape === etape)) {
    if (ch.type === "enfants") {
      for (let i = 0; i < NB_ENFANTS; i++) {
        const n = i + 1;
        cols.push([`enfant${n}_prenom`, ({ v }) => lireEnfants(v[ch.cle])[i]?.prenom ?? ""]);
        cols.push([`enfant${n}_nom`, ({ v }) => lireEnfants(v[ch.cle])[i]?.nom ?? ""]);
        cols.push([`enfant${n}_date_naissance`, ({ v }) => dateFr(lireEnfants(v[ch.cle])[i]?.naissance)]);
      }
    } else if (ch.type === "planning") {
      cols.push(["detail_par_jour", ({ v }) => (v.detail_par_jour === "oui" ? "Oui" : "Non")]);
      for (const j of JOURS_SEMAINE) {
        const h = (v: Record<string, string>) => lirePlanning(v[ch.cle])[j.valeur];
        cols.push([`${j.valeur}_arrivee`, ({ v }) => h(v)?.a ?? ""]);
        cols.push([`${j.valeur}_depart`, ({ v }) => h(v)?.d ?? ""]);
        cols.push([`${j.valeur}_travail_effectif`, ({ v }) => nombreFr(h(v)?.e)]);
        cols.push([`${j.valeur}_presence_responsable`, ({ v }) => nombreFr(h(v)?.r)]);
      }
    } else {
      cols.push([ch.cle, ({ v, c }) => libelleValeur(ch, v[ch.cle] ?? "", c)]);
    }
  }
  return cols;
}

/** Toutes les colonnes, dans l'ordre du formulaire. */
function toutesLesColonnes(): Colonne[] {
  return [
    // La gestion et son suivi
    ["reference_gestion", ({ g }) => g.reference ?? ""],
    ["statut", ({ g }) => LIBELLES_STATUT_GESTION[g.statut] ?? g.statut],
    ["envoyee_le", ({ g }) => dateFr(g.envoyee_le)],
    ["validee_le", ({ g }) => dateFr(g.validee_le)],
    ["date_fin", ({ g }) => dateFr(g.date_fin)],
    // Le compte de l'employeur
    ["reference_client", ({ e }) => e.reference_client ?? ""],
    ["compte_civilite", ({ e }) => e.civilite ?? ""],
    ["compte_prenom", ({ e }) => e.prenom ?? ""],
    ["compte_nom", ({ e }) => e.nom ?? ""],
    ["compte_date_naissance", ({ e }) => dateFr(e.date_naissance)],
    ["compte_email", ({ e }) => e.email ?? ""],
    ["compte_telephone", ({ e }) => e.telephone ?? ""],
    ["compte_adresse", ({ e }) => e.adresse ?? ""],
    ["compte_code_postal", ({ e }) => e.code_postal ?? ""],
    ["compte_ville", ({ e }) => e.ville ?? ""],
    // Étape 1 : le type d'emploi
    ["categorie", ({ g, v }) => (categorie(v.categorie) ?? categorieDeLaGestion(g.type_gestion, v.garde_partagee)).titre],
    ["type_contrat", ({ g }) => g.type_contrat ?? ""],
    ["cdd_remplacement", ({ g }) => (g.remplace_gestion_id ? "Oui" : "Non")],
    ["motif_remplacement", ({ g }) => (g.motif_remplacement ? MOTIFS_REMPLACEMENT[g.motif_remplacement] : "")],
    ...champsDeLEtape("categorie"),
    // Étape 2 : le salarié
    ["prenom_salarie", ({ g }) => g.prenom_salarie ?? ""],
    ["nom_salarie", ({ g }) => g.nom_salarie ?? ""],
    ...champsDeLEtape("salarie"),
    // Étape 3 : le poste
    ["emploi_repere", ({ v }) => emploiRepere(v.emploi_repere)?.libelle ?? ""],
    ["emploi_niveau", ({ v }) => {
      const r = emploiRepere(v.emploi_repere);
      return r ? echelleEnRomain(r.echelle) : "";
    }],
    ...champsDeLEtape("poste"),
    // Étape 4 : le contrat
    ["date_debut", ({ g }) => dateFr(g.date_debut)],
    ["date_fin_prevue", ({ g }) => dateFr(g.date_fin_prevue)],
    ...champsDeLEtape("contrat"),
    // Étape 5 : les horaires
    ["heures", ({ g }) => nombreFr(g.heures)],
    ["unite_heures", ({ g }) => (g.unite_heures === "semaine" ? "par semaine" : g.unite_heures === "mois" ? "par mois" : "")],
    ...champsDeLEtape("horaires"),
    // Étape 6 : salaire et congés
    ["salaire_horaire_net", ({ g }) => nombreFr(g.salaire_horaire_net)],
    ...champsDeLEtape("remuneration"),
    // Étape 7 : vérifier et envoyer
    ...champsDeLEtape("envoi"),
    ["precisions", ({ g }) => g.precisions ?? ""],
  ];
}

/** Ligne de titres et ligne de valeurs d'une gestion. */
export function exportGestion(g: Gestion, e: EmployeurExport): { titres: string[]; valeurs: string[] } {
  const v: Record<string, string> = {
    ...(g.config ?? {}),
    civilite_salarie: g.civilite_salarie ?? "",
    adresse_salarie: g.adresse_salarie ?? "",
    code_postal_salarie: g.code_postal_salarie ?? "",
    ville_salarie: g.ville_salarie ?? "",
  };
  const c: ContexteChamps = {
    type_gestion: g.type_gestion,
    categorie: (categorie(v.categorie) ?? categorieDeLaGestion(g.type_gestion, v.garde_partagee)).cle,
    type_contrat: g.type_contrat ?? "",
    remplacement: Boolean(g.remplace_gestion_id),
  };
  const cols = toutesLesColonnes();
  return { titres: cols.map(([t]) => t), valeurs: cols.map(([, f]) => f({ g, e, v, c })) };
}

/**
 * Cellule CSV : une seule ligne physique (retours à la ligne remplacés),
 * guillemets doublés, et protection contre les formules (une valeur saisie
 * par l'abonné qui commence par « = » ou « @ » ne doit pas s'exécuter dans
 * le tableur ; « +33… » et les nombres négatifs restent intacts).
 */
function cellule(x: string): string {
  let t = x.replace(/\r?\n/g, " / ");
  if (/^[=@]|^[+-](?![\d\s])/.test(t)) t = `'${t}`;
  return /[;"\s]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** CSV pour Excel en français : séparateur « ; », UTF-8 avec BOM, fins de ligne CRLF. */
export function versCsv(lignes: string[][]): string {
  return "﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n") + "\r\n";
}
