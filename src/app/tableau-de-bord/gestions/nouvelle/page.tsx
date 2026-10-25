import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FormulaireGestion } from "../FormulaireGestion";
import { placesAbonnement, salariesRemplacables } from "@/lib/places";
import { lireComplementProfil, profilIncomplet } from "@/lib/user-profile";
import { ProfileForm } from "@/app/mon-compte/ProfileForm";

export const metadata = { title: "Créer une gestion — Aide & Garde" };

/** Création d'une gestion par l'abonné (brique 3). */
export default async function NouvelleGestionPage({
  searchParams,
}: {
  searchParams: Promise<{ remplace?: string }>;
}) {
  const { remplace } = await searchParams;
  const { supabase, user, profile } = await requireUser("/tableau-de-bord/gestions/nouvelle");
  const [places, salaries, { data: ligneProfil }] = await Promise.all([
    placesAbonnement(supabase, user.id),
    salariesRemplacables(supabase, user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);
  // Profil complété une seule fois, avant la première gestion (demande du
  // 25/10) : pas à l'inscription, pour garder le tunnel court.
  const complement = lireComplementProfil(ligneProfil);
  const manque = profile && profile.role !== "admin" && places ? profilIncomplet(profile, complement) : [];
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
        {places && profile && manque.length ? (
          <div className="carte mt-6 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-violet">Étape préalable, une seule fois</p>
            <h2 className="mt-1 font-display text-lg font-bold">Vos coordonnées d&apos;employeur</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Elles figurent sur le contrat, les courriers et certaines déclarations Urssaf. Complétez-les maintenant
              ({manque.join(", ")}) : vous n&apos;aurez plus à les saisir, ni pour cette gestion ni pour les suivantes.
            </p>
            <ProfileForm profile={profile} complement={complement} exiger libelleBouton="Continuer" />
          </div>
        ) : places ? (
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
