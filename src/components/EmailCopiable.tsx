"use client";

import { useState } from "react";

/**
 * Adresse email avec un bouton « Copier » qui apparaît au survol (et
 * reste accessible au clavier). Placée au-dessus du lien étiré des lignes
 * de liste (relative z-10) : copier ne fait pas ouvrir la fiche.
 */
export function EmailCopiable({ email, className = "" }: { email: string; className?: string }) {
  const [copie, setCopie] = useState(false);
  async function copier(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Navigateur sans presse-papiers autorisé : sélection du texte à la place.
      const plage = document.createRange();
      const cible = (e.currentTarget as HTMLElement).previousElementSibling;
      if (cible) {
        plage.selectNodeContents(cible);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(plage);
      }
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 1500);
  }
  return (
    <span className={`group/email relative z-10 inline-flex items-center gap-1 ${className}`}>
      <span className="select-all">{email}</span>
      <button
        type="button"
        onClick={copier}
        title="Copier l'adresse email"
        aria-label={`Copier l'adresse ${email}`}
        className={`rounded px-1 text-[11px] font-bold leading-4 ${
          copie
            ? "bg-brand-teal text-white opacity-100"
            : "hidden bg-brand-violet/15 text-brand-violet group-hover/email:inline-block group-focus-within/email:inline-block [@media(hover:none)]:inline-block"
        }`}
      >
        {copie ? "Copié" : "Copier"}
      </button>
    </span>
  );
}
