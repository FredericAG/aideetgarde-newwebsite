import Link from "next/link";
import Image from "next/image";
import { DeconnexionButton } from "@/components/DeconnexionButton";
import { getSessionCourante } from "@/lib/auth";
import { MenuMobile } from "@/components/MenuMobile";

/** En-tête commun à toutes les pages. */
export async function SiteHeader() {
  // Identité partagée avec la page (un seul appel par affichage, voir
  // src/lib/auth.ts). Avant que Supabase soit configuré, user vaut null et
  // l'en-tête affiche simplement la navigation "déconnecté".
  const { user, profile } = await getSessionCourante();
  const isAdmin = profile?.role === "admin";

  return (
    <header className="border-b border-brand-gray/15 bg-white">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/aide-et-garde-logo.svg"
            alt="Aide & Garde"
            width={505}
            height={159}
            className="h-9 w-auto sm:h-11"
            priority
          />
        </Link>

        {user ? (
          <>
            {/* Ordinateur et tablette */}
            <nav className="hidden items-center gap-2 sm:flex">
              <Link href="/tableau-de-bord" className="btn btn-secondaire btn-sm">
                Tableau de bord
              </Link>
              {isAdmin && (
                <Link href="/admin" className="btn btn-primaire btn-sm">
                  Administration
                </Link>
              )}
              <Link href="/mon-compte" className="btn btn-secondaire btn-sm">
                Mon compte
              </Link>
              <DeconnexionButton className="ml-2 text-sm font-medium text-brand-teal underline disabled:opacity-60" />
            </nav>
            {/* Téléphone */}
            <MenuMobile isAdmin={isAdmin} />
          </>
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/connexion" className="btn btn-secondaire btn-sm">
              Se connecter
            </Link>
            <Link href="/inscription" className="btn btn-primaire btn-sm">
              Créer un compte
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
