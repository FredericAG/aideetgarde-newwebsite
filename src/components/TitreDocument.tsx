import { TYPES_DOCUMENT, formatPeriode, type DocumentRow } from "@/lib/data";

/**
 * Titre d'un document : lien de téléchargement s'il a un fichier PDF,
 * simple texte sinon (anciennes fiches de test sans fichier).
 */
export function TitreDocument({
  doc,
}: {
  doc: Pick<DocumentRow, "id" | "titre" | "storage_path">;
}) {
  if (!doc.storage_path) {
    return (
      <span className="font-medium">
        {doc.titre}{" "}
        <span className="text-xs font-normal text-foreground/50">(sans fichier)</span>
      </span>
    );
  }
  return (
    <a
      href={`/documents/${doc.id}/telecharger`}
      className="font-medium text-brand-teal underline"
    >
      {doc.titre}
    </a>
  );
}

/**
 * Début d'une ligne de document, dans l'ordre demandé : type, période, puis
 * lien de téléchargement. Les deux premières colonnes ont une largeur fixe
 * pour que les listes restent alignées et faciles à parcourir.
 */
export function InfosDocument({ doc }: { doc: DocumentRow }) {
  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="w-40 shrink-0 text-foreground/70">
        {TYPES_DOCUMENT[doc.type_document] ?? doc.type_document}
      </span>
      <span className="w-16 shrink-0 tabular-nums text-foreground/70">
        {doc.periode ? formatPeriode(doc.periode) : "—"}
      </span>
      <span className="min-w-0 break-words">
        <TitreDocument doc={doc} />
      </span>
    </span>
  );
}
