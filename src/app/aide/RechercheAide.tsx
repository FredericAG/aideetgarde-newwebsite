"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntreeRecherche } from "@/lib/aide/contenu";
import { simplifierTexte } from "@/lib/aide/recherche";

/**
 * Recherche instantanée dans les questions du centre d'aide (question,
 * réponse courte et mots clés), sans tenir compte des accents. Tous les
 * mots tapés doivent être trouvés.
 */
export function RechercheAide({ index }: { index: EntreeRecherche[] }) {
  const [texte, setTexte] = useState("");
  const mots = simplifierTexte(texte).split(" ").filter((m) => m.length > 1);
  const resultats = mots.length ? index.filter((e) => mots.every((m) => e.texte.includes(m))).slice(0, 8) : [];

  return (
    <div className="relative">
      <label htmlFor="recherche-aide" className="sr-only">
        Rechercher dans l&apos;aide
      </label>
      <input
        id="recherche-aide"
        type="search"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Rechercher : préavis, congés payés, CMG, attestation…"
        autoComplete="off"
        className="w-full rounded-full border-2 border-brand-jaune bg-white px-5 py-3 text-sm outline-none focus:border-brand-violet"
      />
      {mots.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-brand-gray/25 bg-white" aria-live="polite">
          {resultats.length === 0 ? (
            <p className="px-4 py-3 text-sm text-foreground/70">
              Aucune réponse trouvée. Essayez un autre mot, ou{" "}
              <a href="#contact" className="font-medium text-brand-teal underline">
                posez-nous la question
              </a>
              .
            </p>
          ) : (
            <ul className="liste-alternee divide-y divide-brand-gray/15">
              {resultats.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="block px-4 py-2.5 hover:bg-brand-sky-tint/25">
                    <span className="block text-sm font-bold text-brand-teal">{r.question}</span>
                    <span className="block text-xs text-foreground/60">{r.theme}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
