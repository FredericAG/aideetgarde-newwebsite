"use client";

import Link from "next/link";
import { useRef } from "react";
import { DeconnexionButton } from "@/components/DeconnexionButton";

/**
 * Menu de navigation sur téléphone : un bouton « Menu » qui déplie les
 * liens en grand format (faciles à toucher du doigt). Le menu se referme
 * dès qu'on choisit une destination.
 */
export function MenuMobile({ isAdmin }: { isAdmin: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const fermer = () => {
    if (ref.current) ref.current.open = false;
  };
  const lien = "block px-4 py-3 text-base font-medium text-brand-teal";

  return (
    <details ref={ref} className="relative sm:hidden">
      <summary className="btn btn-secondaire btn-sm list-none [&::-webkit-details-marker]:hidden">
        Menu ☰
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-brand-gray/20 bg-background shadow-lg">
        <Link href="/tableau-de-bord" onClick={fermer} className={lien}>
          Tableau de bord
        </Link>
        {isAdmin && (
          <Link href="/admin" onClick={fermer} className={`${lien} text-brand-violet`}>
            Administration
          </Link>
        )}
        <Link href="/mon-compte" onClick={fermer} className={lien}>
          Mon compte
        </Link>
        <div className="border-t border-brand-gray/15 px-4 py-3">
          <DeconnexionButton />
        </div>
      </div>
    </details>
  );
}
