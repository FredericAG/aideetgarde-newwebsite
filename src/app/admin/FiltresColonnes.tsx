"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { CLES_FILTRES } from "@/lib/filtres-comptes";

const champ =
  "w-full min-w-0 rounded-md border border-brand-violet/30 bg-white px-2 py-1 text-xs font-normal text-foreground outline-none focus:border-brand-violet";

/**
 * Ligne de filtres sous les titres du tableau des comptes : un champ adapté
 * à chaque colonne (texte, année, liste). La liste se met à jour pendant la
 * frappe, sans bouton ; les filtres se combinent entre eux et avec la
 * recherche générale.
 */
export function FiltresColonnes() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(CLES_FILTRES.map((k) => [k, params.get(k) ?? ""])),
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

  const texte = (cle: string, placeholder: string, label: string) => (
    <input
      type="search"
      value={valeurs[cle]}
      onChange={(e) => appliquer(cle, e.target.value, 350)}
      placeholder={placeholder}
      aria-label={label}
      autoComplete="off"
      className={champ}
    />
  );
  const liste = (cle: string, label: string, options: [string, string][]) => (
    <select
      value={valeurs[cle]}
      onChange={(e) => appliquer(cle, e.target.value, 0)}
      aria-label={label}
      className={champ}
    >
      <option value="">Tous</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
  const annee = new Date().getFullYear();
  const annees: [string, string][] = Array.from({ length: 15 }, (_, i) => {
    const a = String(annee - i);
    return [a, a];
  });

  return (
    <tr className="filtres-colonnes">
      <th className="px-2 py-1.5">{texte("fref", "C00…", "Filtrer par référence")}</th>
      <th className="px-2 py-1.5">{texte("femp", "Nom, email, ville…", "Filtrer par employeur")}</th>
      <th className="px-2 py-1.5">{liste("finsc", "Filtrer par année d'inscription", annees)}</th>
      <th className="px-2 py-1.5">
        {liste("fabo", "Filtrer par abonnement", [
          ["actif", "Actif"],
          ["resilie", "Résilié"],
          ["aucun", "Aucun"],
        ])}
      </th>
      <th className="px-2 py-1.5">
        {liste("fges", "Filtrer par gestions", [
          ["en_cours", "Avec gestion en cours"],
          ["a_valider", "Avec gestion à valider"],
          ["brouillon", "Avec brouillon"],
          ["aucune", "Sans gestion active"],
        ])}
      </th>
      <th className="px-2 py-1.5">{texte("fsal", "Nom du salarié…", "Filtrer par salarié")}</th>
      <th className="px-2 py-1.5">
        <span className="flex items-center gap-1">
          {liste("fact", "Filtrer par actions", [
            ["avec", "Avec actions"],
            ["sans", "Sans action"],
          ])}
          {enCours && <span className="text-[10px] font-normal" aria-live="polite">…</span>}
        </span>
      </th>
    </tr>
  );
}
