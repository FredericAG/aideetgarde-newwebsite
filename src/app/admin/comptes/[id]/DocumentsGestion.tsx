import { BoutonConfirme } from "@/components/BoutonConfirme";
import { DocumentsParCategorie } from "@/components/DocumentsParCategorie";
import { IconePoubelle } from "@/components/IconePoubelle";
import { formatPeriode, libelleDocument, type DocumentRow } from "@/lib/data";
import { supprimerDocument } from "./actions";

/**
 * Documents d'une gestion, côté administrateur : tableaux par catégorie
 * (voir DocumentsParCategorie) avec une poubelle par ligne, après
 * confirmation.
 */
export function DocumentsGestion({
  compteId,
  documents,
}: {
  compteId: string;
  /** Documents de la gestion, déjà triés du plus récent au plus ancien. */
  documents: DocumentRow[];
}) {
  return (
    <DocumentsParCategorie
      documents={documents}
      vue="admin"
      action={(d) => (
        <form action={supprimerDocument}>
          <input type="hidden" name="compte_id" value={compteId} />
          <input type="hidden" name="document_id" value={d.id} />
          <BoutonConfirme
            className="rounded-full p-1.5 text-red-700 hover:bg-red-50"
            enCours="…"
            libelle={`Supprimer « ${libelleDocument(d)} »`}
            question="Supprimer ce document ?"
            precision={`${libelleDocument(d)}${d.periode ? ` ${formatPeriode(d.periode)}` : ""}. Le fichier PDF est effacé définitivement ; l'abonné ne pourra plus le télécharger.`}
            oui="Oui, supprimer"
          >
            <IconePoubelle />
          </BoutonConfirme>
        </form>
      )}
    />
  );
}
