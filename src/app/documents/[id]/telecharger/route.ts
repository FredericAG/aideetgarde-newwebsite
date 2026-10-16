import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { BUCKET, formatPeriode, isUuid } from "@/lib/data";

/**
 * Téléchargement d'un PDF : /documents/<id>/telecharger
 *
 * Les fichiers restent stockés en permanence dans l'espace privé Supabase.
 * À chaque clic, on fabrique un lien de téléchargement valable 60 secondes
 * et on y redirige le navigateur : le client peut retélécharger son
 * document autant de fois qu'il veut, mais un lien copié ou transféré
 * cesse de fonctionner au bout d'une minute.
 *
 * Sécurité : la lecture de la fiche du document passe par les règles RLS
 * (un employeur ne voit que ses documents, un admin voit tout), et la
 * création du lien par les règles du stockage (même principe).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  if (!isUuid(id)) {
    return NextResponse.redirect(`${origin}/tableau-de-bord`);
  }

  const { supabase } = await requireUser(`/documents/${id}/telecharger`);

  const { data: doc } = await supabase
    .from("documents")
    .select("titre, periode, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc?.storage_path) {
    return new NextResponse("Document introuvable ou sans fichier.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Nom de fichier lisible pour l'utilisateur, ex. "Bulletin octobre - 10-2026.pdf"
  const periode = doc.periode ? ` - ${formatPeriode(doc.periode).replace("/", "-")}` : "";
  const nom = `${doc.titre}${periode}`
    .replace(/[^\p{L}\p{N} _.-]/gu, "_")
    .slice(0, 120);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path as string, 60, { download: `${nom}.pdf` });

  if (error || !data?.signedUrl) {
    return new NextResponse(
      "Le fichier est momentanément indisponible. Réessayez dans un instant.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
