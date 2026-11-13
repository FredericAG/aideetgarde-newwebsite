import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CONFIG_SIMULATEUR } from "@/lib/simulateur";
import { Simulateur } from "./Simulateur";

export const metadata = {
  title: "Simulateur de coût — Aide & Garde",
  robots: { index: false },
};

/**
 * Simulateur de coût d'un salarié à domicile (décision du 13/11/2026) :
 * réservé aux comptes connectés, abonnés ou non (il aide l'inscrit à se
 * décider avant de choisir sa formule).
 */
export default async function SimulateurPage() {
  await requireUser("/simulateur");
  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <Link href="/tableau-de-bord" className="text-sm text-brand-teal underline">
          ← Tableau de bord
        </Link>
        <h1 className="mt-4 font-display font-black text-2xl text-brand-teal">Combien me coûte mon salarié ?</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/75">
          Garde d&apos;enfants à domicile : le coût par mois après les aides de la CAF, puis sur un an après le crédit
          d&apos;impôt. Le résultat se met à jour à chaque saisie.
        </p>
        <Simulateur />
        <p className="mt-8 max-w-3xl text-xs text-foreground/60">
          Simulation indicative et non contractuelle, établie avec les barèmes {CONFIG_SIMULATEUR.annee} : garde simple,
          hors Alsace-Moselle, déclaration Pajemploi. Les aides dépendent de votre revenu, du nombre d&apos;enfants et de
          l&apos;âge du plus jeune ; la CAF les confirme. Une question ? Votre conseiller Aide &amp; Garde refait le calcul
          avec vous.
        </p>
      </div>
    </div>
  );
}
