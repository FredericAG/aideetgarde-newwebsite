import type { DocumentRow } from "@/lib/data";

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
