"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { estAdministrateur } from "@/lib/user-profile";

export interface LigneImport {
  reference: string;
  montant: number;
  employeurId?: string;
  nom?: string;
}
export interface ApercuImport {
  erreur?: string;
  reconnues: LigneImport[];
  inconnues: string[];
  illisibles: string[];
}

/** « 1 234,56 € » → 1234.56 ; NaN si illisible. */
function montant(t: string): number {
  const n = Number(t.replace(/[\s €]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Lecture d'un fichier « référence client ; montant » (une ligne par
 * abonné, ligne de titres facultative), sans rien enregistrer.
 */
export async function previsualiserImport(texte: string): Promise<ApercuImport> {
  const { supabase, profile } = await requireAdmin("/admin/attestations");
  const vide: ApercuImport = { reconnues: [], inconnues: [], illisibles: [] };
  if (!estAdministrateur(profile)) return { ...vide, erreur: "Action réservée à l'administrateur." };
  const lignes = texte.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lues: LigneImport[] = [];
  const illisibles: string[] = [];
  for (const l of lignes.slice(0, 5000)) {
    const sep = l.includes(";") ? ";" : l.includes("\t") ? "\t" : ",";
    const [ref, m] = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ""));
    const n = montant(m ?? "");
    if (!ref || Number.isNaN(n) || n < 0) {
      if (lues.length || illisibles.length) illisibles.push(l); // la 1re ligne peut être celle des titres
      else illisibles.push(`${l} (ligne de titres ?)`);
      continue;
    }
    lues.push({ reference: ref.toUpperCase(), montant: Math.round(n * 100) / 100 });
  }
  const refs = [...new Set(lues.map((l) => l.reference))];
  const trouves = new Map<string, { id: string; nom: string }>();
  for (let i = 0; i < refs.length; i += 200) {
    const { data } = await supabase.from("profiles").select("id, reference_client, prenom, nom").in("reference_client", refs.slice(i, i + 200));
    for (const p of data ?? []) trouves.set(String(p.reference_client).toUpperCase(), { id: p.id as string, nom: `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() });
  }
  const reconnues: LigneImport[] = [];
  const inconnues: string[] = [];
  for (const l of lues) {
    const t = trouves.get(l.reference);
    if (t) reconnues.push({ ...l, employeurId: t.id, nom: t.nom });
    else inconnues.push(`${l.reference} ; ${l.montant}`);
  }
  return { reconnues, inconnues, illisibles };
}

/** Enregistre les montants reconnus (remplace l'import précédent de l'année). */
export async function confirmerImport(annee: number, lignes: LigneImport[]): Promise<string> {
  const { supabase, profile } = await requireAdmin("/admin/attestations");
  if (!estAdministrateur(profile)) return "Action réservée à l'administrateur.";
  if (!Number.isInteger(annee) || annee < 2020 || annee >= new Date().getFullYear()) return "Année invalide.";
  // Un abonné présent deux fois : montants additionnés.
  const parCompte = new Map<string, number>();
  for (const l of lignes) if (l.employeurId) parCompte.set(l.employeurId, (parCompte.get(l.employeurId) ?? 0) + l.montant);
  const lignesBase = [...parCompte].map(([employeur_id, m]) => ({
    employeur_id,
    annee,
    montant_importe: Math.round(m * 100) / 100,
    maj_le: new Date().toISOString(),
  }));
  for (let i = 0; i < lignesBase.length; i += 500) {
    const { error } = await supabase.from("attestations_montants").upsert(lignesBase.slice(i, i + 500), { onConflict: "employeur_id,annee" });
    if (error) {
      return error.code === "42P01" || error.code === "PGRST205"
        ? "Exécutez d'abord le script supabase/brique15_attestations_fiscales.sql."
        : `Enregistrement refusé : ${error.message}`;
    }
  }
  revalidatePath("/admin/attestations");
  return `${lignesBase.length} montant(s) enregistré(s) pour ${annee}.`;
}

/** Ajustement d'un compte (remboursement, geste commercial). */
export async function enregistrerAjustement(fd: FormData): Promise<void> {
  const { supabase, profile } = await requireAdmin("/admin/attestations");
  if (!estAdministrateur(profile)) return;
  const employeur = String(fd.get("employeur_id") ?? "");
  const annee = Number(fd.get("annee"));
  const ajustement = montant(String(fd.get("ajustement") ?? "0").replace("−", "-"));
  if (!employeur || !Number.isInteger(annee) || Number.isNaN(ajustement)) return;
  await supabase
    .from("attestations_montants")
    .upsert({ employeur_id: employeur, annee, ajustement, note: String(fd.get("note") ?? "").slice(0, 300) || null, maj_le: new Date().toISOString() }, { onConflict: "employeur_id,annee" });
  revalidatePath("/admin/attestations");
}
