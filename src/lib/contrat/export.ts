import { MOTIFS_REMPLACEMENT, TYPES_GESTION, type Gestion } from "@/lib/data";
import { CHAMPS, JOURS_SEMAINE, lireEnfants, lirePlanning } from "./champs";
import { categorie, categorieDeLaGestion, echelleEnRomain, emploiRepere } from "./classification";

/**
 * Export d'une gestion pour le logiciel de paie (demande du 07/11/2026) :
 * un fichier CSV, une ligne de titres et une ligne de valeurs, avec un
 * NOMBRE DE COLONNES FIGÉ. Toutes les colonnes sont toujours présentes, dans
 * le même ordre, vides quand l'information ne s'applique pas.
 *
 * Titres : les clés techniques (stables, elles ne changent pas quand un
 * libellé du formulaire est reformulé). Valeurs : codes des choix (« cdi »,
 * « convention »…), dates JJ/MM/AAAA, nombres à virgule.
 *
 * Ajouter un champ au formulaire ajoute une colonne À LA FIN de son bloc :
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

type Colonne = [titre: string, valeur: (g: Gestion, e: EmployeurExport, v: Record<string, string>) => string];

const COLONNES_GESTION: Colonne[] = [
  ["reference_gestion", (g) => g.reference ?? ""],
  ["statut", (g) => g.statut],
  ["type_gestion", (g) => TYPES_GESTION[g.type_gestion] ?? g.type_gestion],
  ["categorie", (g, _e, v) => (categorie(v.categorie) ?? categorieDeLaGestion(g.type_gestion, v.garde_partagee)).cle],
  ["emploi_repere", (_g, _e, v) => emploiRepere(v.emploi_repere)?.libelle ?? ""],
  ["emploi_niveau", (_g, _e, v) => {
    const r = emploiRepere(v.emploi_repere);
    return r ? echelleEnRomain(r.echelle) : "";
  }],
  ["prenom_salarie", (g) => g.prenom_salarie ?? ""],
  ["nom_salarie", (g) => g.nom_salarie ?? ""],
  ["date_debut", (g) => dateFr(g.date_debut)],
  ["type_contrat", (g) => g.type_contrat ?? ""],
  ["date_fin_prevue", (g) => dateFr(g.date_fin_prevue)],
  ["heures", (g) => nombreFr(g.heures)],
  ["unite_heures", (g) => g.unite_heures ?? ""],
  ["salaire_horaire_net", (g) => nombreFr(g.salaire_horaire_net)],
  ["precisions", (g) => g.precisions ?? ""],
  ["cdd_remplacement", (g) => (g.remplace_gestion_id ? "oui" : "non")],
  ["motif_remplacement", (g) => (g.motif_remplacement ? MOTIFS_REMPLACEMENT[g.motif_remplacement] : "")],
  ["envoyee_le", (g) => dateFr(g.envoyee_le)],
  ["validee_le", (g) => dateFr(g.validee_le)],
  ["date_fin", (g) => dateFr(g.date_fin)],
];

const COLONNES_EMPLOYEUR: Colonne[] = [
  ["reference_client", (_g, e) => e.reference_client ?? ""],
  ["compte_civilite", (_g, e) => e.civilite ?? ""],
  ["compte_prenom", (_g, e) => e.prenom ?? ""],
  ["compte_nom", (_g, e) => e.nom ?? ""],
  ["compte_date_naissance", (_g, e) => dateFr(e.date_naissance)],
  ["compte_email", (_g, e) => e.email ?? ""],
  ["compte_telephone", (_g, e) => e.telephone ?? ""],
  ["compte_adresse", (_g, e) => e.adresse ?? ""],
  ["compte_code_postal", (_g, e) => e.code_postal ?? ""],
  ["compte_ville", (_g, e) => e.ville ?? ""],
];

/** Colonnes des champs du formulaire, enfants et horaires par jour dépliés. */
function colonnesFormulaire(): Colonne[] {
  const cols: Colonne[] = [];
  for (const ch of CHAMPS) {
    if (ch.type === "enfants") {
      for (let i = 0; i < NB_ENFANTS; i++) {
        const n = i + 1;
        cols.push([`enfant${n}_prenom`, (_g, _e, v) => lireEnfants(v[ch.cle])[i]?.prenom ?? ""]);
        cols.push([`enfant${n}_nom`, (_g, _e, v) => lireEnfants(v[ch.cle])[i]?.nom ?? ""]);
        cols.push([`enfant${n}_date_naissance`, (_g, _e, v) => dateFr(lireEnfants(v[ch.cle])[i]?.naissance)]);
      }
    } else if (ch.type === "planning") {
      cols.push(["detail_par_jour", (_g, _e, v) => (v.detail_par_jour === "oui" ? "oui" : "non")]);
      for (const j of JOURS_SEMAINE) {
        const h = (v: Record<string, string>) => lirePlanning(v[ch.cle])[j.valeur];
        cols.push([`${j.valeur}_arrivee`, (_g, _e, v) => h(v)?.a ?? ""]);
        cols.push([`${j.valeur}_depart`, (_g, _e, v) => h(v)?.d ?? ""]);
        cols.push([`${j.valeur}_travail_effectif`, (_g, _e, v) => nombreFr(h(v)?.e)]);
        cols.push([`${j.valeur}_presence_responsable`, (_g, _e, v) => nombreFr(h(v)?.r)]);
      }
    } else {
      cols.push([
        ch.cle,
        (_g, _e, v) => {
          const val = v[ch.cle] ?? "";
          if (ch.type === "date") return dateFr(val);
          if (ch.type === "nombre" || ch.type === "montant") return nombreFr(val);
          if (ch.type === "multi") return val.split("|").filter(Boolean).join(", ");
          return val;
        },
      ]);
    }
  }
  return cols;
}

function toutesLesColonnes(): Colonne[] {
  return [...COLONNES_GESTION, ...COLONNES_EMPLOYEUR, ...colonnesFormulaire()];
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
  const cols = toutesLesColonnes();
  return { titres: cols.map(([t]) => t), valeurs: cols.map(([, f]) => f(g, e, v)) };
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
