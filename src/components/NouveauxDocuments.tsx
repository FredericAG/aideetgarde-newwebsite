"use client";

import { useState } from "react";
import { LienTelechargement } from "@/components/LienTelechargement";
import { TYPES_DOCUMENT, libelleMois, type DocumentRow } from "@/lib/data";

/**
 * Bandeau des documents que l'abonné n'a pas encore téléchargés, en tête de
 * page : une ligne compacte par document, avec son bouton de téléchargement.
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
      className="mt-6 overflow-hidden rounded-xl border border-brand-jaune bg-white"
    >
      <h2 className="flex items-center gap-2 bg-brand-jaune px-4 py-2 text-sm font-bold text-brand-black">
        <span
          aria-hidden="true"
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-violet px-1.5 text-xs text-white"
        >
          {nouveaux.length}
        </span>
        {nouveaux.length === 1 ? "Nouveau document disponible" : "Nouveaux documents disponibles"}
      </h2>
      <ul className="liste-alternee divide-y divide-brand-gray/15">
        {nouveaux.map((d) => {
          const libelle = TYPES_DOCUMENT[d.type_document] ?? "Document";
          const salarie = salaries?.[d.id];
          return (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-bold text-brand-teal">
                  {libelle}
                  {d.periode ? ` de ${libelleMois(d.periode)}` : ""}
                </span>
                {salarie && <span className="block text-xs text-foreground/60 sm:ml-2 sm:inline">{salarie}</span>}
              </span>
              <LienTelechargement
                documentId={d.id}
                onTelecharge={() => setTelecharges((t) => [...t, d.id])}
                className="btn btn-primaire btn-sm shrink-0"
              >
                ⬇ Télécharger
              </LienTelechargement>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
