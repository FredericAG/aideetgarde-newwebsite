import { TYPES_DOCUMENT, libelleMois, type DocumentRow } from "@/lib/data";

/**
 * Bandeau des documents que l'abonné n'a pas encore téléchargés, en tête de
 * page, avec un gros bouton par document (facile à toucher sur téléphone).
 * Un document quitte ce bandeau dès son premier téléchargement.
 */
export function NouveauxDocuments({
  documents,
  nomSalarie,
}: {
  documents: DocumentRow[];
  /** Nom du salarié à afficher sous chaque bouton (tableau de bord). */
  nomSalarie?: (doc: DocumentRow) => string;
}) {
  const nouveaux = documents.filter((d) => d.storage_path && !d.consulte_le);
  if (nouveaux.length === 0) return null;

  return (
    <section
      aria-label="Nouveaux documents"
      className="mt-6 rounded-lg border-2 border-brand-teal bg-brand-teal/10 p-4 sm:p-5"
    >
      <h2 className="font-bold text-brand-teal">
        {nouveaux.length === 1
          ? "Un nouveau document est disponible"
          : `${nouveaux.length} nouveaux documents sont disponibles`}
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {nouveaux.map((d) => {
          const libelle = TYPES_DOCUMENT[d.type_document] ?? "Document";
          return (
            <li key={d.id}>
              <a
                href={`/documents/${d.id}/telecharger`}
                className="flex w-full flex-col rounded-md bg-brand-teal px-4 py-3 text-white sm:w-auto sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="text-base font-semibold">
                  ⬇ Télécharger : {libelle}
                  {d.periode ? ` de ${libelleMois(d.periode)}` : ""}
                </span>
                {nomSalarie && (
                  <span className="text-sm text-white/80">{nomSalarie(d)}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
