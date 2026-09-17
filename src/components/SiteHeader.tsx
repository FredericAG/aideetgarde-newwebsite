import Link from "next/link";
import Image from "next/image";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DeconnexionButton } from "@/components/DeconnexionButton";

/**
 * En-tête commun à toutes les pages. `getUser()` revalide le jeton auprès
 * de Supabase — un peu plus coûteux qu'une simple lecture de cookie, mais
 * reste raisonnable ici (Next.js dé-duplique les appels identiques dans une
 * même requête) et évite d'afficher "Se connecter" à quelqu'un dont la
 * session vient d'expirer.
 */
export async function SiteHeader() {
  // Avant que le projet Supabase soit configuré (voir .env.example), on
  // affiche simplement la navigation "déconnecté" plutôt que de planter
  // chaque page du site.
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;
  }

  return (
    <header className="border-b border-brand-gray/15">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/aide-et-garde-logo.svg"
            alt="Aide & Garde"
            width={505}
            height={159}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link
                href="/mon-compte"
                className="font-medium text-brand-teal underline"
              >
                Mon compte
              </Link>
              <DeconnexionButton />
            </>
          ) : (
            <>
              <Link href="/connexion" className="font-medium text-brand-teal underline">
                Se connecter
              </Link>
              <Link
                href="/inscription"
                className="rounded-md bg-brand-violet px-3 py-1.5 font-semibold text-white"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
