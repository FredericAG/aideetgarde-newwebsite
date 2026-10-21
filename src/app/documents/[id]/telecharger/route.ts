import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { BUCKET, isUuid, type TypeDocument } from "@/lib/data";
import { nomTelechargement } from "@/lib/nom-fichier";

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

  const { supabase, user } = await requireUser(`/documents/${id}/telecharger`);

  const { data: doc } = await supabase
    .from("documents")
    .select("type_document, complement, periode, storage_path, employeur_id, gestion_id, consulte_le")
    .eq("id", id)
    .maybeSingle();

  if (!doc?.storage_path) {
    return new NextResponse("Document introuvable ou sans fichier.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Nom du fichier enregistré (norme du 21/10, sans la référence de
  // gestion) : « DUPONT_MARTIN_BP_2605.pdf », sur ordinateur comme sur
  // téléphone. Noms lus dans la base (mêmes règles d'accès que le document).
  const [{ data: employeur }, { data: gestion }] = await Promise.all([
    supabase.from("profiles").select("nom").eq("id", doc.employeur_id).maybeSingle(),
    supabase.from("gestions").select("nom_salarie").eq("id", doc.gestion_id).maybeSingle(),
  ]);
  const nom = nomTelechargement({
    employeur: (employeur?.nom as string | undefined) ?? "",
    salarie: (gestion?.nom_salarie as string | undefined) ?? "",
    type: doc.type_document as TypeDocument,
    periode: (doc.periode as string | null) ?? null,
    complement: (doc.complement as string | null) ?? null,
  });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path as string, 60, { download: nom });

  if (error || !data?.signedUrl) {
    return new NextResponse(
      "Le fichier est momentanément indisponible. Réessayez dans un instant.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  // Premier téléchargement par l'abonné lui-même : le document n'est plus
  // « nouveau » (un téléchargement par l'administrateur ne compte pas).
  if (doc.employeur_id === user.id && !doc.consulte_le) {
    await supabase.rpc("marquer_document_consulte", { p_document_id: id });
  }

  return NextResponse.redirect(data.signedUrl);
}
