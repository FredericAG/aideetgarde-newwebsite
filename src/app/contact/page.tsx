import Link from "next/link";
import type { Metadata } from "next";
import { ENTREPRISE } from "@/lib/entreprise";

export const metadata: Metadata = {
  title: "Contact — Aide & Garde",
  description: "Parlez gratuitement à un conseiller Aide & Garde : coût de l'emploi à domicile, aides, contrat, fin de contrat.",
  alternates: { canonical: "/contact" },
};

/**
 * Contact (page publique, 07/11/2026). Version minimale tant que le texte
 * définitif n'est pas fourni par le chat « Site » (arborescence, étape 2) :
 * horaires de la permanence et bloc « Contact presse » à ajouter.
 */
export default function ContactPage() {
  const tel = ENTREPRISE.telephone;
  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full max-w-2xl">
        <h1 className="font-display font-black text-2xl text-brand-teal sm:text-3xl">Contact</h1>
        <p className="mt-2 text-foreground/80">
          Coût de l&apos;emploi, aides, contrat, fin de contrat : un conseiller vous répond gratuitement.
        </p>

        <section className="carte mt-8 p-5">
          <h2 className="font-bold text-brand-violet">Parler à un conseiller</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a href={`tel:${tel.replace(/\s/g, "").replace(/^0/, "+33")}`} className="btn btn-primaire">
              Appeler le {tel}
            </a>
            <a href={`mailto:${ENTREPRISE.email}`} className="btn btn-secondaire">
              {ENTREPRISE.email}
            </a>
          </div>
          <p className="mt-2 text-xs text-foreground/60">Numéro non surtaxé.</p>
        </section>

        <p className="mt-8 text-sm text-foreground/70">
          Déjà abonné ? Les réponses aux questions courantes sont dans votre{" "}
          <Link href="/aide" className="font-medium text-brand-teal underline">
            centre d&apos;aide
          </Link>{" "}
          (réservé aux abonnés connectés).
        </p>
      </div>
    </div>
  );
}
