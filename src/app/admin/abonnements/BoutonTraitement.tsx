"use client";

import { useState, useTransition } from "react";
import { lancerTraitementQuotidien } from "./actions";

/** Bouton « Lancer le traitement des échéances maintenant ». */
export function BoutonTraitement() {
  const [bilan, setBilan] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        disabled={enCours}
        onClick={() => demarrer(async () => setBilan(await lancerTraitementQuotidien()))}
        className="btn btn-secondaire btn-sm whitespace-nowrap"
      >
        {enCours ? "Traitement en cours…" : "Lancer le traitement maintenant"}
      </button>
      {bilan && (
        <p role="status" className="text-xs text-foreground/70">
          {bilan}
        </p>
      )}
    </div>
  );
}
