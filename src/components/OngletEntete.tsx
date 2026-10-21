"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Onglet de l'en-tête (ordinateur et tablette) : l'onglet de la page
 * affichée est mis en valeur (fond violet, texte blanc), comme dans la
 * barre du téléphone, pour savoir d'un coup d'œil où l'on se trouve.
 * Les sous-pages comptent pour leur onglet (une gestion → Tableau de bord,
 * une fiche de compte → Comptes).
 */
export function OngletEntete({
  href,
  sousPages = [],
  exact = false,
  children,
}: {
  href: string;
  /** Débuts d'adresse rattachés à cet onglet, en plus de `href`. */
  sousPages?: string[];
  /** `href` ne compte que s'il est exactement l'adresse affichée. */
  exact?: boolean;
  children: React.ReactNode;
}) {
  const chemin = usePathname() ?? "";
  const actif =
    (exact ? chemin === href : chemin === href || chemin.startsWith(`${href}/`)) ||
    sousPages.some((p) => chemin === p || chemin.startsWith(`${p}/`));
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`onglet-entete btn btn-sm ${actif ? "btn-primaire" : "btn-secondaire"}`}
    >
      {children}
    </Link>
  );
}
