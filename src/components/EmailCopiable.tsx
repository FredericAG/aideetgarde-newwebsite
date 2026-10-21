"use client";

import { useState } from "react";

/**
 * Adresse email suivie d'un bouton « Copier » toujours visible, de largeur
 * fixe (« Copié » prend la même place : rien ne bouge à l'écran). Placée au-dessus du lien étiré des lignes
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
    <span className={`relative z-10 inline-flex flex-wrap items-center gap-x-1.5 ${className}`}>
      <span className="select-all break-all">{email}</span>
      <button
        type="button"
        onClick={copier}
        title="Copier l'adresse email"
        aria-label={`Copier l'adresse ${email}`}
        className={`inline-flex w-[4.75rem] shrink-0 items-center justify-center gap-1 rounded border px-1 text-[11px] font-bold leading-4 ${
          copie
            ? "border-brand-teal bg-brand-teal text-white"
            : "border-brand-violet/40 bg-brand-violet/10 text-brand-violet hover:bg-brand-violet/20"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
          {copie ? (
            <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="5" y="5" width="8" height="9" rx="1.5" />
              <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" strokeLinecap="round" />
            </>
          )}
        </svg>
        {copie ? "Copié" : "Copier"}
      </button>
    </span>
  );
}
