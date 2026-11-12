import { NextResponse } from "next/server";
import { getSessionCourante } from "@/lib/auth";
import type { Gestion } from "@/lib/data";
import { exportGestion, versCsv, type EmployeurExport } from "@/lib/contrat/export";

const STATUTS = { envoyee: "a-valider", en_cours: "en-cours" } as const;

/**
 * Export groupé des gestions (audit du 12/11/2026) : le même fichier que
 * « Télécharger le formulaire (CSV) » d'une fiche, avec une ligne par
 * gestion. /admin/gestions/export?statut=envoyee (gestions à valider, par
 * défaut) ou en_cours. Réservé à l'administrateur.
 */
export async function GET(request: Request) {
  const introuvable = () => new NextResponse("Page introuvable", { status: 404 });
  const { supabase, profile } = await getSessionCourante();
  if (!supabase || profile?.role !== "admin") return introuvable();
  const demande = new URL(request.url).searchParams.get("statut") ?? "envoyee";
  if (!(demande in STATUTS)) return introuvable();
  const statut = demande as keyof typeof STATUTS;

  // 1 000 lignes au plus par appel : lecture page par page.
  const gestions: Gestion[] = [];
  for (let de = 0; de < 50000; de += 1000) {
    const { data, error } = await supabase.from("gestions").select("*").eq("statut", statut).order("reference").range(de, de + 999);
    if (error) return new NextResponse("Lecture impossible", { status: 500 });
    gestions.push(...((data ?? []) as Gestion[]));
    if ((data ?? []).length < 1000) break;
  }

  const ids = [...new Set(gestions.map((g) => g.employeur_id))];
  const employeurs = new Map<string, EmployeurExport>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await supabase.from("profiles").select("*").in("id", ids.slice(i, i + 150));
    for (const p of (data ?? []) as (EmployeurExport & { id: string })[]) employeurs.set(p.id, p);
  }

  let titres: string[] = exportGestion({ config: {} } as Gestion, {}).titres;
  const lignes = gestions.map((g) => {
    const e = exportGestion(g, employeurs.get(g.employeur_id) ?? {});
    titres = e.titres;
    return e.valeurs;
  });
  const jour = new Date().toISOString().slice(0, 10);
  return new NextResponse(versCsv([titres, ...lignes]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gestions-${STATUTS[statut]}-${jour}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
