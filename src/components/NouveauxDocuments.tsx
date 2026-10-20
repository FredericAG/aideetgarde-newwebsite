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
  /** Nom du salarié à afficher à côté de chaque bouton (tableau de bord). */
  nomSalarie?: (doc: DocumentRow) => string;
}) {
  const nouveaux = documents.filter((d) => d.storage_path && !d.consulte_le);
  if (nouveaux.length === 0) return null;

  return (
    <section
      aria-label="Nouveaux documents"
      className="mt-6 rounded-xl border-2 border-brand-jaune bg-brand-jaune/25 p-4 sm:p-5"
    >
      <h2 className="font-bold text-brand-violet">
        {nouveaux.length === 1
          ? "Un nouveau document est disponible"
          : `${nouveaux.length} nouveaux documents sont disponibles`}
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {nouveaux.map((d) => {
          const libelle = TYPES_DOCUMENT[d.type_document] ?? "Document";
          const salarie = nomSalarie?.(d);
          return (
            <li key={d.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <a
                href={`/documents/${d.id}/telecharger`}
                className="btn btn-primaire btn-lg w-full sm:w-auto"
              >
                ⬇ Télécharger : {libelle}
                {d.periode ? ` de ${libelleMois(d.periode)}` : ""}
              </a>
              {salarie && (
                <span className="text-center text-sm text-foreground/70 sm:text-left">
                  {salarie}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
