import Link from "next/link";

export const metadata = {
  title: "Aide et contact — Aide & Garde",
  description:
    "Une question sur votre espace, un bulletin ou une démarche ? Contactez Aide & Garde par téléphone ou par email.",
};

/**
 * Aide et contact (onglet « Aide » de la barre du téléphone). Reprend le
 * bloc « Une question ? Besoin d'accompagnement ? » de l'ancien site.
 */
export default function AidePage() {
  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Aide et contact</h1>

        <section className="carte mt-6 p-5">
          <h2 className="font-bold text-brand-violet">
            Une question ? Besoin d&apos;accompagnement ?
          </h2>
          <p className="mt-1 text-sm text-foreground/80">
            Votre conseiller Aide &amp; Garde vous répond.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a href="tel:+33188320118" className="btn btn-primaire btn-lg">
              Appeler le 01 88 320 118
            </a>
            <a href="mailto:contact@aideetgarde.fr" className="btn btn-secondaire btn-lg">
              contact@aideetgarde.fr
            </a>
          </div>
          <p className="mt-2 text-xs text-foreground/60">Numéro non surtaxé.</p>
        </section>

        <section className="mt-8">
          <h2 className="font-bold text-brand-teal">Dans votre espace</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground/80">
            <li>
              <Link href="/tableau-de-bord" className="text-brand-teal underline">
                Accueil
              </Link>{" "}
              : vos salariés, le statut du mois en cours et le bouton pour
              déclarer les heures.
            </li>
            <li>
              <Link href="/tableau-de-bord/documents" className="text-brand-teal underline">
                Documents
              </Link>{" "}
              : tous vos bulletins, contrats et attestations, à télécharger à
              tout moment.
            </li>
            <li>
              <Link href="/mon-compte" className="text-brand-teal underline">
                Compte
              </Link>{" "}
              : vos coordonnées, les notifications sur votre téléphone et la
              déconnexion.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
