"use client";

import { useState } from "react";
import { LienTelechargement } from "@/components/LienTelechargement";
import { TYPES_DOCUMENT, libelleMois, type DocumentRow } from "@/lib/data";

/**
 * Bandeau des documents que l'abonné n'a pas encore téléchargés, en tête de
 * page, avec un gros bouton par document (facile à toucher sur téléphone).
 * Un bouton disparaît dès le clic ; le bandeau entier disparaît avec le
 * dernier (sans attendre d'actualiser la page).
 */
export function NouveauxDocuments({
  documents,
  salaries,
}: {
  documents: DocumentRow[];
  /** Nom du salarié par identifiant de document (tableau de bord). */
  salaries?: Record<string, string>;
}) {
  const [telecharges, setTelecharges] = useState<string[]>([]);
  const nouveaux = documents.filter(
    (d) => d.storage_path && !d.consulte_le && !telecharges.includes(d.id),
  );
  if (nouveaux.length === 0) return null;

  return (
    <section
      aria-label="Nouveaux documents"
      aria-live="polite"
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
          const salarie = salaries?.[d.id];
          return (
            <li key={d.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <LienTelechargement
                documentId={d.id}
                onTelecharge={() => setTelecharges((t) => [...t, d.id])}
                className="btn btn-primaire btn-lg w-full sm:w-auto"
              >
                ⬇ Télécharger : {libelle}
                {d.periode ? ` de ${libelleMois(d.periode)}` : ""}
              </LienTelechargement>
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
