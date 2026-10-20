"use client";

import { useState } from "react";

/**
 * Tableau limité à quelques lignes (5 par défaut) avec un bouton pour
 * déplier la suite. Une fois déplié, le tableau garde une hauteur d'environ
 * dix lignes et se fait défiler à la molette (l'en-tête reste visible), pour
 * ne pas allonger démesurément la page quand une gestion compte des
 * dizaines de bulletins.
 */
export function TableauDepliable({
  entete,
  lignes,
  visibles = 5,
  colonnes,
}: {
  /** Ligne d'en-tête (<tr> avec des <th>). */
  entete: React.ReactNode;
  /** Lignes du tableau (<tr key=…>), déjà triées. */
  lignes: React.ReactNode[];
  visibles?: number;
  /** Largeurs des colonnes (<col>), pour garder l'alignement. */
  colonnes: React.ReactNode;
}) {
  const [deplie, setDeplie] = useState(false);
  const reste = lignes.length - visibles;
  const defilement = deplie && lignes.length > 10;

  return (
    <div>
      <div
        className={
          defilement
            ? "max-h-[27rem] overflow-y-auto rounded-lg border border-brand-gray/20"
            : ""
        }
      >
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>{colonnes}</colgroup>
          <thead className="sticky top-0 z-10 bg-white text-xs text-brand-teal">
            {entete}
          </thead>
          <tbody>{deplie ? lignes : lignes.slice(0, visibles)}</tbody>
        </table>
      </div>
      {reste > 0 && (
        <button
          type="button"
          onClick={() => setDeplie(!deplie)}
          aria-expanded={deplie}
          className="btn btn-secondaire btn-sm mt-2"
        >
          {deplie
            ? "▲ Réduire"
            : `▼ Afficher les ${reste} document${reste > 1 ? "s" : ""} suivant${reste > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
