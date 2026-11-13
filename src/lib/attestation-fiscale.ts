import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { documentEnPdf } from "@/lib/courriers/generer";
import { formatDate, formatEuros } from "@/lib/data";
import { ENTREPRISE } from "@/lib/entreprise";
import { configSystempay } from "@/lib/systempay";

/**
 * Attestation fiscale annuelle (13/11/2026) : sommes versées à Aide & Garde
 * dans l'année (frais de mandat), pour le crédit d'impôt de l'emploi d'un
 * salarié à domicile (CGI art. 199 sexdecies ; mentions de l'article
 * D. 7233-4 du code du travail ; à remettre avant le 31 mars).
 *
 * Montant = paiements acceptés par le site dans l'année (mode du paiement en
 * service : PRODUCTION, ou TEST en recette) − premier mois remboursé après
 * une rétractation + montant importé pour les paiements faits ailleurs
 * (ancien site) + ajustement manuel (script brique15). Un mois offert
 * (parrainage) n'est pas payé : il n'y figure pas.
 */
export interface DonneesAttestation {
  annee: number;
  numero: string;
  employeur: { nom: string; adresse: string[]; reference: string };
  paiementsSite: number;
  rembourse: number;
  importe: number;
  ajustement: number;
  total: number;
  carte: string | null;
  salaries: { nom: string; periode: string }[];
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function anneesProposees(aujourdhui = new Date()): number[] {
  const a = aujourdhui.getFullYear();
  return [a - 1, a - 2, a - 3].filter((x) => x >= 2025);
}

export async function lireAttestation(
  supabase: SupabaseClient,
  employeurId: string,
  annee: number,
): Promise<DonneesAttestation | null> {
  if (!Number.isInteger(annee) || annee < 2020 || annee >= new Date().getFullYear()) return null;
  const debut = `${annee}-01-01T00:00:00+01:00`;
  const fin = `${annee + 1}-01-01T00:00:00+01:00`;
  const mode = configSystempay()?.mode ?? "PRODUCTION";

  const [profilRes, paiementsRes, importRes, retractRes, gestionsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", employeurId).maybeSingle(),
    supabase
      .from("paiements")
      .select("montant, carte_masquee, created_at")
      .eq("employeur_id", employeurId)
      .eq("statut", "PAID")
      .eq("mode", mode)
      .gte("created_at", debut)
      .lt("created_at", fin),
    supabase.from("attestations_montants").select("montant_importe, ajustement").eq("employeur_id", employeurId).eq("annee", annee).maybeSingle(),
    supabase.from("retractations").select("abonnement_id, rembourse_le").eq("employeur_id", employeurId).gte("rembourse_le", debut).lt("rembourse_le", fin),
    supabase
      .from("gestions")
      .select("prenom_salarie, nom_salarie, date_debut, date_fin, statut")
      .eq("employeur_id", employeurId)
      .in("statut", ["en_cours", "terminee"])
      .lte("date_debut", `${annee}-12-31`),
  ]);
  const p = profilRes.data as Record<string, unknown> | null;
  if (!p) return null;

  const paiements = (paiementsRes.data ?? []) as { montant: number; carte_masquee: string | null; created_at: string }[];
  const paiementsSite = r2(paiements.reduce((s, x) => s + Number(x.montant), 0));

  // Rétractation remboursée dans l'année : le premier mois ne compte pas.
  let rembourse = 0;
  for (const r of (retractRes.data ?? []) as { abonnement_id: string }[]) {
    const { data: c } = await supabase
      .from("commandes")
      .select("montant")
      .eq("abonnement_id", r.abonnement_id)
      .eq("type", "souscription")
      .eq("statut", "payee")
      .maybeSingle();
    rembourse += Number(c?.montant ?? 0);
  }
  const importe = Number(importRes.data?.montant_importe ?? 0);
  const ajustement = Number(importRes.data?.ajustement ?? 0);
  const total = Math.max(0, r2(paiementsSite - rembourse + importe + ajustement));

  const salaries = ((gestionsRes.data ?? []) as { prenom_salarie: string | null; nom_salarie: string | null; date_debut: string | null; date_fin: string | null }[])
    .filter((g) => !g.date_fin || g.date_fin >= `${annee}-01-01`)
    .map((g) => {
      const de = g.date_debut && g.date_debut > `${annee}-01-01` ? g.date_debut : `${annee}-01-01`;
      const a = g.date_fin && g.date_fin < `${annee}-12-31` ? g.date_fin : `${annee}-12-31`;
      return {
        nom: `${g.prenom_salarie ?? ""} ${g.nom_salarie ?? ""}`.trim() || "Salarié",
        periode: `du ${formatDate(de)} au ${formatDate(a)}`,
      };
    });

  const civilite = String(p.civilite ?? "");
  const nom = [civilite, p.prenom, p.nom].filter(Boolean).join(" ").trim();
  const reference = String(p.reference_client ?? employeurId.slice(0, 8));
  return {
    annee,
    numero: `AF-${annee}-${reference}`,
    employeur: {
      nom,
      adresse: [String(p.adresse ?? ""), `${p.code_postal ?? ""} ${p.ville ?? ""}`.trim()].filter(Boolean),
      reference,
    },
    paiementsSite,
    rembourse: r2(rembourse),
    importe,
    ajustement,
    total,
    carte: paiements.find((x) => x.carte_masquee)?.carte_masquee ?? null,
    salaries,
  };
}

export async function attestationEnPdf(d: DonneesAttestation): Promise<Uint8Array> {
  const e = ENTREPRISE;
  const detail: string[] = [];
  if (d.paiementsSite) detail.push(`Paiements par carte bancaire reçus en ligne : ${formatEuros(d.paiementsSite)}${d.carte ? ` (carte se terminant par ${d.carte.slice(-4)})` : ""}`);
  if (d.rembourse) detail.push(`Premier mois remboursé après rétractation : − ${formatEuros(d.rembourse)}`);
  if (d.importe) detail.push(`Paiements antérieurs à l'espace en ligne : ${formatEuros(d.importe)}`);
  if (d.ajustement) detail.push(`Régularisation : ${d.ajustement > 0 ? "" : "− "}${formatEuros(Math.abs(d.ajustement))}`);

  return documentEnPdf(
    {
      expediteur: [
        e.denomination ?? e.nomCommercial,
        ...(e.siege ? [e.siege] : []),
        `SIRET ${e.siret}`,
        `Organisme de services à la personne déclaré, ${e.sap ?? `n° SAP ${e.numeroSap}`}`,
        "Mode mandataire",
      ],
      destinataire: [d.employeur.nom || "Abonné Aide & Garde", ...d.employeur.adresse, `Référence client ${d.employeur.reference}`],
      lieuDate: `Paris, le ${formatDate(new Date().toISOString().slice(0, 10))}`,
      titre: `Attestation fiscale ${d.annee}`,
      corps: [
        `Attestation n° ${d.numero}.`,
        `${e.denomination ?? e.nomCommercial} atteste que ${d.employeur.nom || "le bénéficiaire désigné ci-dessus"} a effectivement acquitté, du 1er janvier au 31 décembre ${d.annee}, la somme de ${formatEuros(d.total)} au titre des frais de mandat pour l'emploi direct de salarié(s) à domicile (services à la personne en mode mandataire).`,
        ...(detail.length ? ["Détail :", { liste: detail }] : []),
        ...(d.salaries.length
          ? ["Salarié(s) employé(s) par le bénéficiaire et concerné(s) par le mandat :", { liste: d.salaries.map((s) => `${s.nom}, ${s.periode}`) }]
          : []),
        "Ces sommes ouvrent droit au crédit d'impôt pour l'emploi d'un salarié à domicile (article 199 sexdecies du code général des impôts), dans les conditions et limites prévues par la loi. Les salaires et cotisations versés à vos salariés ne figurent pas sur cette attestation : ils sont attestés par l'Urssaf (Cesu ou Pajemploi).",
        "Document établi électroniquement, à conserver : l'administration fiscale peut le demander.",
      ],
      signatures: [`Pour ${e.denomination ?? e.nomCommercial}, ${e.directeurPublication ?? "le président"}`],
    },
    `Attestation fiscale ${d.annee} – ${e.nomCommercial}`,
  );
}
