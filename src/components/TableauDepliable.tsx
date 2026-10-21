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
  classeTable = "",
  classeEntete = "",
}: {
  /** Ligne d'en-tête (<tr> avec des <th>). */
  entete: React.ReactNode;
  /** Lignes du tableau (<tr key=…>), déjà triées. */
  lignes: React.ReactNode[];
  visibles?: number;
  /** Largeurs des colonnes (<col>), pour garder l'alignement. */
  colonnes: React.ReactNode;
  /** Classes ajoutées au <table> (ex. « tableau-adaptatif » côté abonné). */
  classeTable?: string;
  /** Classes de la ligne de titres (couleur de la catégorie). */
  classeEntete?: string;
}) {
  const [deplie, setDeplie] = useState(false);
  const reste = lignes.length - visibles;
  const defilement = deplie && lignes.length > 10;

  return (
    <div>
      <div
        className={`overflow-hidden rounded-lg border border-brand-gray/20 ${
          defilement ? "max-h-[27rem] overflow-y-auto" : ""
        }`}
      >
        <table className={`w-full table-fixed border-collapse text-left text-sm ${classeTable}`}>
          <colgroup>{colonnes}</colgroup>
          <thead className={`sticky top-0 z-10 text-xs ${classeEntete}`}>{entete}</thead>
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
            : reste === 1
              ? "▼ Afficher le document suivant"
              : `▼ Afficher les ${reste} documents suivants`}
        </button>
      )}
    </div>
  );
}
