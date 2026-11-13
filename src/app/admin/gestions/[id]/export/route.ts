import { NextResponse } from "next/server";
import { getSessionCourante } from "@/lib/auth";
import { isUuid, type Gestion } from "@/lib/data";
import { exportGestion, versCsv, type EmployeurExport } from "@/lib/contrat/export";
import { estEquipe } from "@/lib/user-profile";

/**
 * Téléchargement d'une gestion au format CSV (une ligne de titres, une ligne
 * de valeurs, colonnes figées) pour l'import dans le logiciel de paie.
 * Réservé à l'administrateur ; 404 pour tout autre visiteur.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const introuvable = () => new NextResponse("Page introuvable", { status: 404 });
  const { supabase, profile } = await getSessionCourante();
  if (!supabase || !estEquipe(profile) || !isUuid(id)) return introuvable();

  const { data: g } = await supabase.from("gestions").select("*").eq("id", id).maybeSingle();
  if (!g) return introuvable();
  const { data: e } = await supabase.from("profiles").select("*").eq("id", g.employeur_id).maybeSingle();

  const { titres, valeurs } = exportGestion(g as Gestion, (e ?? {}) as EmployeurExport);
  const nom = `${g.reference ?? "gestion"}-${String(g.nom_salarie ?? "")}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/-+$/, "");
  return new NextResponse(versCsv([titres, valeurs]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
