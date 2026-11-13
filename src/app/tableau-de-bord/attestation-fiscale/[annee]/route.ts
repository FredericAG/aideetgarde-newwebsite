import { getSessionCourante } from "@/lib/auth";
import { attestationEnPdf, lireAttestation } from "@/lib/attestation-fiscale";

/** Attestation fiscale de l'abonné connecté, pour une année écoulée (PDF). */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ annee: string }> }) {
  const { annee } = await params;
  const { supabase, user } = await getSessionCourante();
  if (!supabase || !user) return new Response("Connectez-vous pour télécharger votre attestation.", { status: 401 });
  const d = await lireAttestation(supabase, user.id, Number(annee));
  if (!d || d.total <= 0) return new Response("Aucune somme versée cette année-là.", { status: 404 });
  const pdf = await attestationEnPdf(d);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Attestation-fiscale-${d.annee}_Aide-et-Garde.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
