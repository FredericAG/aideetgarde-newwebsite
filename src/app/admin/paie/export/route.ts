import { NextResponse } from "next/server";
import { getSessionCourante } from "@/lib/auth";
import { TYPES_GESTION, formatPeriode } from "@/lib/data";
import { versCsv } from "@/lib/contrat/export";
import { LIBELLES_ETAT_PAIE, lirePaieDuMois, periodeValide, type EtatPaie, type LignePaie } from "@/lib/paie-du-mois";

function dateFr(v: string | null | undefined): string {
  const t = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}` : "";
}
const nombreFr = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

/**
 * Colonnes du fichier, toujours les mêmes et dans le même ordre (import
 * dans le logiciel de paie) : une ligne de titres, puis une ligne par
 * gestion. Titres = clés techniques stables.
 */
const COLONNES: [string, (l: LignePaie, periode: string) => string][] = [
  ["periode", (_l, p) => formatPeriode(p)],
  ["etat", (l) => LIBELLES_ETAT_PAIE[l.etat]],
  ["reference_gestion", (l) => l.gestion.reference ?? ""],
  ["reference_client", (l) => l.employeur.reference_client ?? ""],
  ["employeur_nom", (l) => l.employeur.nom],
  ["employeur_prenom", (l) => l.employeur.prenom],
  ["employeur_email", (l) => l.employeur.email ?? ""],
  ["salarie_nom", (l) => l.gestion.nom_salarie ?? ""],
  ["salarie_prenom", (l) => l.gestion.prenom_salarie ?? ""],
  ["emploi", (l) => TYPES_GESTION[l.gestion.type_gestion] ?? l.gestion.type_gestion],
  ["type_contrat", (l) => l.gestion.type_contrat ?? ""],
  ["heures_contrat", (l) => nombreFr(l.gestion.heures)],
  ["unite_heures", (l) => (l.gestion.unite_heures === "semaine" ? "par semaine" : l.gestion.unite_heures === "mois" ? "par mois" : "")],
  ["salaire_horaire_net", (l) => nombreFr(l.gestion.salaire_horaire_net)],
  ["declaration_recue", (l) => (l.declaration ? "Oui" : "Non")],
  ["heures_declarees", (l) => nombreFr(l.declaration?.heures)],
  ["commentaire", (l) => l.declaration?.commentaire ?? ""],
  ["declaree_le", (l) => dateFr(l.declaration?.envoyee_le)],
  ["correction_demandee", (l) => (l.declaration?.correction ? "Oui" : "Non")],
  ["motif_correction", (l) => l.declaration?.motif_modification ?? ""],
  ["bulletin_mis_en_ligne_le", (l) => dateFr(l.bulletin_le)],
  ["gestion_statut", (l) => (l.gestion.statut === "terminee" ? "Terminée" : "En cours")],
  ["date_debut", (l) => dateFr(l.gestion.date_debut)],
  ["date_fin", (l) => dateFr(l.gestion.date_fin)],
];

/**
 * Export de la paie du mois (réservé à l'administrateur) :
 * /admin/paie/export?mois=2611&etat=a_traiter (ou sans_declaration,
 * bulletin, close ; sans `etat` : toutes les gestions du mois).
 */
export async function GET(request: Request) {
  const introuvable = () => new NextResponse("Page introuvable", { status: 404 });
  const { supabase, profile } = await getSessionCourante();
  if (!supabase || profile?.role !== "admin") return introuvable();
  const url = new URL(request.url);
  const mois = url.searchParams.get("mois");
  if (!periodeValide(mois)) return introuvable();
  const etat = url.searchParams.get("etat");
  const filtre = etat && etat in LIBELLES_ETAT_PAIE ? (etat as EtatPaie) : null;

  const lignes = (await lirePaieDuMois(supabase, mois)).filter((l) => !filtre || l.etat === filtre);
  const csv = versCsv([COLONNES.map(([t]) => t), ...lignes.map((l) => COLONNES.map(([, f]) => f(l, mois)))]);
  const nom = `paie-20${mois.slice(0, 2)}-${mois.slice(2)}${filtre ? `-${filtre.replace(/_/g, "-")}` : ""}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
