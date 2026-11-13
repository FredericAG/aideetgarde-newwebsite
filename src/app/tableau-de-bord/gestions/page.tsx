import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { gestionParDefaut, listerMesGestions } from "@/lib/mes-gestions";
import { placesAbonnement } from "@/lib/places";
import { PremiereGestion } from "./PremiereGestion";
import { estEquipe } from "@/lib/user-profile";

export const metadata = { title: "Mes gestions — Aide & Garde" };
// Dépend de la session : jamais préparée à l'avance.
export const dynamic = "force-dynamic";

/**
 * Onglet « Mes gestions » (remplace « Documents », 24/10) : ouvre
 * directement la gestion la plus utile (nouveau document, sinon dernier
 * document), d'où l'on passe aux autres par les pastilles du haut.
 */
export default async function MesGestionsPage() {
  const { supabase, user, profile } = await requireUser("/tableau-de-bord/gestions");
  if (estEquipe(profile)) redirect("/admin");
  const choisie = gestionParDefaut(await listerMesGestions(supabase, user.id));
  if (choisie) redirect(`/tableau-de-bord/gestions/${choisie.id}`);
  const places = await placesAbonnement(supabase, user.id);

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Mes gestions</h1>
        <PremiereGestion abonne={places !== null} />
      </div>
    </div>
  );
}
