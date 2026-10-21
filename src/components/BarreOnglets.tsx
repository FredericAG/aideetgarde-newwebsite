"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Onglet = {
  href: string;
  libelle: string;
  actif: (p: string) => boolean;
  icone: React.ReactNode;
  pastille?: number;
};

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
  abonnements: (
    <svg viewBox="0 0 24 24" {...trait} className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  ),
  archives: (
    <svg viewBox="0 0 24 24" {...trait} className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
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
 * dans les applications installées) : toujours sous le pouce. Fond violet
 * de la charte bordé de jaune, bien distinct du contenu ; rubrique en cours
 * sur pastille blanche. Remplace le menu « ☰ » sur téléphone.
 */
export function BarreOnglets({ isAdmin, actionsAdmin = 0 }: { isAdmin: boolean; actionsAdmin?: number }) {
  const chemin = usePathname();
  const ongletsAdmin: Onglet[] = [
    {
      href: "/admin",
      libelle: "Comptes",
      actif: (p) => p === "/admin" || p.startsWith("/admin/comptes"),
      icone: icones.admin,
      pastille: actionsAdmin,
    },
    {
      href: "/admin/abonnements",
      libelle: "Abonnements",
      actif: (p) => p.startsWith("/admin/abonnements"),
      icone: icones.abonnements,
    },
    {
      href: "/admin/archives",
      libelle: "Archivés",
      actif: (p) => p.startsWith("/admin/archives"),
      icone: icones.archives,
    },
    {
      href: "/mon-compte",
      libelle: "Compte",
      actif: (p) => p.startsWith("/mon-compte"),
      icone: icones.compte,
    },
  ];
  const ongletsAbonne: Onglet[] = [
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
    { href: "/aide", libelle: "Aide", actif: (p) => p.startsWith("/aide"), icone: icones.aide },
    {
      href: "/mon-compte",
      libelle: "Compte",
      actif: (p) => p.startsWith("/mon-compte"),
      icone: icones.compte,
    },
  ];

  const onglets = isAdmin ? ongletsAdmin : ongletsAbonne;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-brand-jaune bg-brand-violet pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.18)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {onglets.map((o) => {
          const actif = o.actif(chemin);
          return (
            <li key={o.href}>
              <Link
                href={o.href}
                aria-current={actif ? "page" : undefined}
                className={`relative mx-1 my-1 flex flex-col items-center gap-0.5 rounded-xl pb-1.5 pt-2 text-xs font-bold ${
                  actif ? "bg-[#fff] text-[#685c9b]" : "text-white/85"
                }`}
              >
                {o.icone}
                {o.libelle}
                {o.pastille ? (
                  <span
                    className="absolute right-[22%] top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] leading-5 text-white"
                    aria-label={`${o.pastille} action(s) à effectuer`}
                  >
                    {o.pastille}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
