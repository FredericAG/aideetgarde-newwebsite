"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Recherche instantanée dans les comptes : la liste se met à jour pendant
 * la frappe (après une courte pause), sans bouton. La recherche porte sur
 * le nom, le prénom, l'email, la référence client, la ville, le téléphone,
 * les salariés et les références de gestion, sans tenir compte des accents.
 */
export function RechercheComptes() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [valeur, setValeur] = useState(params.get("q") ?? "");
  const [enCours, demarrer] = useTransition();
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);

  function lancer(texte: string) {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (texte.trim()) p.set("q", texte.trim());
      else p.delete("q");
      p.delete("page");
      demarrer(() => router.replace(`${chemin}?${p.toString()}`, { scroll: false }));
    }, 300);
  }

  return (
    <div className="relative">
      <label htmlFor="recherche-comptes" className="sr-only">
        Rechercher un compte
      </label>
      <input
        id="recherche-comptes"
        type="search"
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          lancer(e.target.value);
        }}
        placeholder="Rechercher : nom, email, référence (C00012, AG00034), salarié, ville, téléphone…"
        autoComplete="off"
        className="w-full rounded-full border-2 border-brand-jaune bg-white px-5 py-2.5 text-sm outline-none focus:border-brand-violet"
      />
      {enCours && (
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-foreground/50" aria-live="polite">
          Recherche…
        </span>
      )}
    </div>
  );
}
