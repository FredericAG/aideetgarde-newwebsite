"use client";

import { useState, useTransition } from "react";
import { enregistrerPreferenceEmail } from "./actions";

/**
 * Copie des notifications par email (activée par défaut). Le choix est
 * enregistré dès que la case change, sans bouton « Enregistrer ».
 */
export function PreferenceEmail({ actifInitial, email }: { actifInitial: boolean; email: string }) {
  const [actif, setActif] = useState(actifInitial);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <section className="carte mt-6 p-4 text-sm sm:p-5">
      <h2 className="font-bold text-brand-teal">Emails</h2>
      <label className="mt-2 flex items-start gap-3">
        <input
          type="checkbox"
          checked={actif}
          disabled={enCours}
          onChange={(e) => {
            const valeur = e.target.checked;
            setActif(valeur);
            setMessage(null);
            demarrer(async () => {
              const r = await enregistrerPreferenceEmail(valeur);
              setMessage(r.message);
              if (!r.ok) setActif(!valeur);
            });
          }}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-violet)]"
        />
        <span className="text-foreground/80">
          Recevoir aussi un email à <strong>{email}</strong> à chaque nouveau
          document et à chaque étape de mes gestions (gestion validée, à
          compléter…).
        </span>
      </label>
      <p className="mt-2 text-xs text-foreground/60">
        Les documents ne sont jamais joints aux emails : ils se téléchargent
        depuis votre espace sécurisé.
      </p>
      {message && (
        <p className="mt-2 text-brand-teal" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
