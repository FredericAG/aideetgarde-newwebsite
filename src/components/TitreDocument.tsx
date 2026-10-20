import { TYPES_DOCUMENT, formatDate, formatPeriode, type DocumentRow } from "@/lib/data";

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
export function InfosDocument({
  doc,
  vue = "abonne",
}: {
  doc: DocumentRow;
  /** « admin » : indique si l'abonné a téléchargé le document. */
  vue?: "abonne" | "admin";
}) {
  const nouveau = Boolean(doc.storage_path) && !doc.consulte_le;
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
        {vue === "abonne" && nouveau && (
          <span className="ml-2 rounded-full bg-brand-teal px-2 py-0.5 text-xs font-semibold text-white">
            Nouveau
          </span>
        )}
        {vue === "admin" && doc.storage_path && (
          <span className="ml-2 text-xs text-foreground/50">
            {doc.consulte_le
              ? `téléchargé par l'abonné le ${formatDate(doc.consulte_le)}`
              : "pas encore téléchargé par l'abonné"}
          </span>
        )}
      </span>
    </span>
  );
}
