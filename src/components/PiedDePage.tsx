import Link from "next/link";

/**
 * Pied de page de toutes les pages : liens vers les informations légales
 * (mentions légales, confidentialité et cookies, CGV) et vers la
 * résiliation en ligne, qui doivent rester accessibles en permanence
 * (service-public.gouv.fr, fiche F37351 ; Code de la consommation,
 * art. L215-1-1).
 */
export function PiedDePage() {
  const lien = "underline-offset-2 hover:underline";
  return (
    <footer className="mt-auto border-t border-brand-gray/15 px-4 py-5 text-xs text-foreground/60 sm:px-6">
      <nav aria-label="Informations légales" className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2">
        <span>© Aide &amp; Garde</span>
        <Link href="/mentions-legales" className={lien}>
          Mentions légales
        </Link>
        <Link href="/confidentialite" className={lien}>
          Confidentialité et cookies
        </Link>
        <Link href="/cgv" className={lien}>
          Conditions générales de vente
        </Link>
        <Link href="/tableau-de-bord/abonnement#resilier" className={lien}>
          Résilier votre contrat
        </Link>
        <Link href="/aide#contact" className={lien}>
          Contact
        </Link>
      </nav>
    </footer>
  );
}
