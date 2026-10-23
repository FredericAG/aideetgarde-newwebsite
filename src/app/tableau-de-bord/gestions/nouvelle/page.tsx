import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FormulaireGestion } from "../FormulaireGestion";
import { placesAbonnement, salariesRemplacables } from "@/lib/places";

export const metadata = { title: "Créer une gestion — Aide & Garde" };

/** Création d'une gestion par l'abonné (brique 3). */
export default async function NouvelleGestionPage({
  searchParams,
}: {
  searchParams: Promise<{ remplace?: string }>;
}) {
  const { remplace } = await searchParams;
  const { supabase, user } = await requireUser("/tableau-de-bord/gestions/nouvelle");
  const [places, salaries] = await Promise.all([
    placesAbonnement(supabase, user.id),
    salariesRemplacables(supabase, user.id),
  ]);
  const cible = salaries.find((s) => s.id === remplace);

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <Link href="/tableau-de-bord" className="text-sm text-brand-teal underline">
          ← Tableau de bord
        </Link>
        {cible ? (
          <>
            <h1 className="mt-4 font-display font-black text-2xl text-brand-teal">Ajouter un salarié remplaçant</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Pour remplacer {cible.nom} pendant son absence. Ce CDD de remplacement ne prend pas de place dans votre
              abonnement.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display font-black text-2xl text-brand-teal">Créer une gestion</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Une gestion correspond à un salarié que vous employez. Renseignez ce
              que vous savez déjà : vous pouvez enregistrer un brouillon et le
              compléter plus tard.
            </p>
          </>
        )}
        {places ? (
          <FormulaireGestion
            dateParDefaut={new Date().toISOString().slice(0, 10)}
            quota={places}
            salariesEnCours={salaries}
            remplacementInitial={cible}
          />
        ) : (
          <div className="carte mt-6 p-5 text-sm">
            <p>
              Il faut un abonnement actif pour créer une gestion. Contactez-nous
              pour le mettre en place.
            </p>
            <Link href="/aide" className="btn btn-primaire mt-4">
              Nous contacter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
