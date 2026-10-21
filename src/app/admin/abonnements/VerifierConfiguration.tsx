"use client";

import { useState, useTransition } from "react";
import { verifierConfiguration, type PointControle } from "./actions";

/** Bouton « Vérifier la configuration » du paiement, avec le bilan point par point. */
export function VerifierConfiguration() {
  const [points, setPoints] = useState<PointControle[] | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={enCours}
        onClick={() => demarrer(async () => setPoints(await verifierConfiguration()))}
        className="btn btn-secondaire btn-sm whitespace-nowrap"
      >
        {enCours ? "Vérification…" : "Vérifier la configuration"}
      </button>
      {points && (
        <ul className="mt-3 flex flex-col gap-1 text-xs" role="status">
          {points.map((p) => (
            <li key={p.libelle} className="flex gap-2">
              <span aria-hidden="true" className={p.ok ? "text-brand-teal" : "text-red-700"}>
                {p.ok ? "✓" : "✗"}
              </span>
              <span>
                <strong>{p.libelle}</strong> : {p.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
