import { getSessionCourante } from "@/lib/auth";
import { attestationEnPdf, lireAttestation } from "@/lib/attestation-fiscale";
import { isUuid } from "@/lib/data";
import { estEquipe } from "@/lib/user-profile";

/** Attestation fiscale d'un abonné, téléchargée par l'équipe (PDF). */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; annee: string }> }) {
  const { id, annee } = await params;
  const { supabase, profile } = await getSessionCourante();
  if (!supabase || !estEquipe(profile) || !isUuid(id)) return new Response("Introuvable", { status: 404 });
  const d = await lireAttestation(supabase, id, Number(annee));
  if (!d || d.total <= 0) return new Response("Aucune somme versée cette année-là pour ce compte.", { status: 404 });
  const pdf = await attestationEnPdf(d);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Attestation-fiscale-${d.annee}_${d.employeur.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
