"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Onglet = { href: string; libelle: string; actif: (p: string) => boolean; icone: React.ReactNode };

const trait = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icones = {
  accueil: (
    <svg viewBox="0 0 24 24" {...trait} className="h-6 w-6" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24" {...trait} className="h-6 w-6" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  ),
  aide: (
    <svg viewBox="0 0 24 24" {...trait} className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <path d="M12 17h.01" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" {...trait} className="h-6 w-6" aria-hidden="true">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  compte: (
    <svg viewBox="0 0 24 24" {...trait} className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
};

/**
 * Barre d'onglets fixée en bas de l'écran, sur téléphone uniquement (comme
 * dans les applications installées) : toujours sous le pouce, rubrique en
 * cours en violet. Remplace le menu « ☰ » sur téléphone.
 */
export function BarreOnglets({ isAdmin }: { isAdmin: boolean }) {
  const chemin = usePathname();
  const onglets: Onglet[] = [
    {
      href: "/tableau-de-bord",
      libelle: "Accueil",
      actif: (p) => p === "/tableau-de-bord" || p.startsWith("/tableau-de-bord/gestions"),
      icone: icones.accueil,
    },
    {
      href: "/tableau-de-bord/documents",
      libelle: "Documents",
      actif: (p) => p.startsWith("/tableau-de-bord/documents"),
      icone: icones.documents,
    },
    isAdmin
      ? { href: "/admin", libelle: "Admin", actif: (p) => p.startsWith("/admin"), icone: icones.admin }
      : { href: "/aide", libelle: "Aide", actif: (p) => p.startsWith("/aide"), icone: icones.aide },
    {
      href: "/mon-compte",
      libelle: "Compte",
      actif: (p) => p.startsWith("/mon-compte"),
      icone: icones.compte,
    },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-gray/20 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {onglets.map((o) => {
          const actif = o.actif(chemin);
          return (
            <li key={o.href}>
              <Link
                href={o.href}
                aria-current={actif ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-xs font-bold ${
                  actif
                    ? "text-brand-violet shadow-[inset_0_3px_0_var(--brand-violet)]"
                    : "text-brand-teal/80"
                }`}
              >
                {o.icone}
                {o.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
