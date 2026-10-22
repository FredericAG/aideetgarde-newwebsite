import Link from "next/link";
import Image from "next/image";
import { DeconnexionButton } from "@/components/DeconnexionButton";
import { OngletEntete } from "@/components/OngletEntete";
import { getSessionCourante } from "@/lib/auth";
import { compterActionsAdmin } from "@/lib/actions-admin";

/** En-tête commun à toutes les pages. */
export async function SiteHeader() {
  // Identité partagée avec la page (un seul appel par affichage, voir
  // src/lib/auth.ts). Avant que Supabase soit configuré, user vaut null et
  // l'en-tête affiche simplement la navigation "déconnecté".
  const { supabase, user, profile } = await getSessionCourante();
  const isAdmin = profile?.role === "admin";
  // Pastille « actions à effectuer » sur le lien Administration.
  const actions = isAdmin && supabase ? (await compterActionsAdmin(supabase)).total : 0;

  return (
    <header className="border-b border-brand-gray/15 bg-white">
      {/* Repère du thème sombre de l'administration (voir globals.css). */}
      {isAdmin && <span className="theme-admin hidden" aria-hidden="true" />}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link href={isAdmin ? "/admin" : "/"} className="flex items-center gap-2">
          <Image
            src="/aide-et-garde-logo.svg"
            alt="Aide & Garde"
            width={505}
            height={159}
            className="h-9 w-auto shrink-0 sm:h-10"
            priority
          />
        </Link>

        {user ? (
          <>
            {/* Ordinateur et tablette */}
            <nav className="hidden items-center gap-2 whitespace-nowrap sm:flex">
              {isAdmin ? (
                /* Administrateur : onglets de gestion, pas ceux d'un abonné. */
                <>
                  <OngletEntete href="/admin" exact sousPages={["/admin/comptes"]}>
                    Comptes
                    {actions > 0 && (
                      <span
                        className="ml-1 rounded-full bg-brand-violet px-1.5 text-xs text-white"
                        aria-label={`${actions} action(s) à effectuer`}
                      >
                        {actions}
                      </span>
                    )}
                  </OngletEntete>
                  <OngletEntete href="/admin/abonnements">
                    Abonnements
                  </OngletEntete>
                  <OngletEntete href="/admin/depot">
                    Dépôt
                  </OngletEntete>
                  <OngletEntete href="/admin/archives">
                    Archivés
                  </OngletEntete>
                  <OngletEntete href="/mon-compte">
                    Mon compte
                  </OngletEntete>
                </>
              ) : (
                <>
                  <OngletEntete href="/tableau-de-bord" exact sousPages={["/tableau-de-bord/gestions"]}>
                    Tableau de bord
                  </OngletEntete>
                  <OngletEntete href="/tableau-de-bord/documents">
                    Documents
                  </OngletEntete>
                  <OngletEntete href="/tableau-de-bord/abonnement">
                    Abonnement
                  </OngletEntete>
                  <OngletEntete href="/mon-compte">
                    Mon compte
                  </OngletEntete>
                  <OngletEntete href="/aide">
                    Aide
                  </OngletEntete>
                </>
              )}
              <DeconnexionButton className="ml-2 text-sm font-medium text-brand-teal underline disabled:opacity-60" />
            </nav>
            {/* Téléphone : navigation par la barre d'onglets en bas de
                l'écran (src/components/BarreOnglets.tsx). */}
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
