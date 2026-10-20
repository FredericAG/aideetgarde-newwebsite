import Link from "next/link";
import { DeconnexionButton } from "@/components/DeconnexionButton";

/**
 * Lien ouvert avec un autre compte que celui auquel il est destiné (ex. un
 * lien reçu par email alors qu'on est connecté avec une autre adresse).
 */
export function AutreCompte({ email, retour }: { email: string | null; retour: string }) {
  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="font-display text-2xl font-black text-brand-teal">
          Ce lien concerne un autre compte
        </h1>
        <p className="mt-3 text-sm text-foreground/80">
          Vous êtes connecté avec <strong>{email ?? "un autre compte"}</strong>, qui
          n&apos;a pas accès à cette page. Si vous avez reçu ce lien par email,
          déconnectez-vous puis reconnectez-vous avec l&apos;adresse qui a reçu
          l&apos;email.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <DeconnexionButton
            className="btn btn-primaire"
            redirection={`/connexion?next=${encodeURIComponent(retour)}`}
          />
          <Link href="/tableau-de-bord" className="btn btn-secondaire">
            Rester sur mon tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
