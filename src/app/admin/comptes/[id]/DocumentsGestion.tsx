import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { TableauDepliable } from "@/components/TableauDepliable";
import { TitreDocument } from "@/components/TitreDocument";
import {
  CATEGORIES_DOCUMENT,
  TYPES_DOCUMENT,
  categorieDocument,
  formatDate,
  formatPeriode,
  type DocumentRow,
} from "@/lib/data";
import { supprimerDocument } from "./actions";

const th = "border-b border-brand-gray/30 px-2 py-1.5 font-bold";
const td = "border-b border-brand-gray/15 px-2 py-2 align-middle";

/**
 * Documents d'une gestion, côté administrateur : trois catégories
 * (éléments contractuels, bulletins de paie, autres), en colonnes titrées
 * identiques d'une catégorie à l'autre (alignement vertical).
 * Chaque catégorie montre ses 5 documents les plus récents ; un bouton
 * déplie la suite dans une zone qui défile.
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
    <div className="mt-3 flex flex-col gap-5">
      {CATEGORIES_DOCUMENT.map((cat) => {
        const docs = documents.filter((d) => categorieDocument(d.type_document) === cat.cle);

        if (docs.length === 0) {
          return (
            <p key={cat.cle} className="text-sm">
              <span className="font-bold text-brand-teal">{cat.titre}</span>
              <span className="ml-2 text-foreground/50">aucun document</span>
            </p>
          );
        }

        return (
          <section key={cat.cle} aria-label={cat.titre}>
            <h3 className="text-sm">
              <span className="font-bold text-brand-teal">
                {cat.titre} ({docs.length})
              </span>
              <span className="ml-2 text-xs text-foreground/50">{cat.aide}</span>
            </h3>
            <div className="mt-1 overflow-x-auto">
              <div className="min-w-[36rem]">
                <TableauDepliable
                  colonnes={
                    <>
                      <col className="w-44" />
                      <col className="w-20" />
                      <col />
                      <col className="w-32" />
                      <col className="w-24" />
                    </>
                  }
                  entete={
                    <tr>
                      <th className={th}>Type</th>
                      <th className={th}>Période</th>
                      <th className={th}>Titre (vu par l&apos;abonné)</th>
                      <th className={th} title="Premier téléchargement par l'abonné">
                        Téléchargé le
                      </th>
                      <th className={th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  }
                  lignes={docs.map((d) => (
                    <tr key={d.id} className="hover:bg-brand-sky-tint/20">
                      <td className={`${td} text-foreground/80`}>
                        {TYPES_DOCUMENT[d.type_document] ?? d.type_document}
                      </td>
                      <td className={`${td} tabular-nums`}>
                        {d.periode ? formatPeriode(d.periode) : "—"}
                      </td>
                      <td className={`${td} break-words`}>
                        <TitreDocument doc={d} />
                      </td>
                      <td className={`${td} tabular-nums`}>
                        {!d.storage_path ? (
                          <span className="text-xs text-foreground/50">sans fichier</span>
                        ) : d.consulte_le ? (
                          formatDate(d.consulte_le)
                        ) : (
                          <span
                            className="font-bold text-red-600"
                            title="Pas encore téléchargé par l'abonné"
                          >
                            —<span className="sr-only">pas encore téléchargé</span>
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        <form action={supprimerDocument}>
                          <input type="hidden" name="compte_id" value={compteId} />
                          <input type="hidden" name="document_id" value={d.id} />
                          <BoutonEnvoi
                            className="text-xs text-red-700 underline"
                            enCours="Suppression…"
                          >
                            Supprimer
                          </BoutonEnvoi>
                        </form>
                      </td>
                    </tr>
                  ))}
                />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
