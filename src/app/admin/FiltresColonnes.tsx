"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { FiltreColonne } from "@/lib/filtres-comptes";

const champ =
  "w-full min-w-0 rounded-md border border-brand-violet/30 bg-white px-2 py-1 text-xs font-normal text-foreground outline-none focus:border-brand-violet";

/**
 * Ligne de filtres sous les titres d'un tableau de l'administration : un
 * champ adapté à chaque colonne (texte ou liste), décrit par `colonnes`
 * (lib/filtres-comptes.ts). La liste se met à jour pendant la frappe, sans
 * bouton ; les filtres se combinent entre eux et avec la recherche générale.
 */
export function FiltresColonnes({ colonnes }: { colonnes: FiltreColonne[] }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(colonnes.map((c) => [c.cle, params.get(c.cle) ?? ""])),
  );
  const [enCours, demarrer] = useTransition();
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);

  function appliquer(cle: string, valeur: string, delai: number) {
    setValeurs((v) => ({ ...v, [cle]: valeur }));
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (valeur.trim()) p.set(cle, valeur.trim());
      else p.delete(cle);
      p.delete("page");
      demarrer(() => router.replace(`${chemin}?${p.toString()}`, { scroll: false }));
    }, delai);
  }

  return (
    <tr className="filtres-colonnes">
      {colonnes.map((c, i) => {
        const derniere = i === colonnes.length - 1;
        const saisie =
          c.type === "texte" ? (
            <input
              type="search"
              value={valeurs[c.cle]}
              onChange={(e) => appliquer(c.cle, e.target.value, 350)}
              placeholder={c.placeholder}
              aria-label={c.label}
              autoComplete="off"
              className={champ}
            />
          ) : (
            <select
              value={valeurs[c.cle]}
              onChange={(e) => appliquer(c.cle, e.target.value, 0)}
              aria-label={c.label}
              className={champ}
            >
              <option value="">Tous</option>
              {c.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          );
        return (
          <th key={c.cle} className="px-2 py-1.5">
            {derniere ? (
              <span className="flex items-center gap-1">
                {saisie}
                {enCours && <span className="text-[10px] font-normal" aria-live="polite">…</span>}
              </span>
            ) : (
              saisie
            )}
          </th>
        );
      })}
    </tr>
  );
}
