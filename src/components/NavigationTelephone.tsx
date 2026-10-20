import { BarreOnglets } from "@/components/BarreOnglets";
import { getSessionCourante } from "@/lib/auth";
import { compterActionsAdmin } from "@/lib/actions-admin";

/**
 * Barre d'onglets du téléphone, affichée seulement à une personne connectée,
 * avec un espace réservé en bas de page pour qu'elle ne cache pas la fin du
 * contenu.
 */
export async function NavigationTelephone() {
  const { supabase, user, profile } = await getSessionCourante();
  if (!user) return null;
  const isAdmin = profile?.role === "admin";
  const actions = isAdmin && supabase ? (await compterActionsAdmin(supabase)).total : 0;
  return (
    <>
      <div aria-hidden="true" className="h-[calc(4.75rem+env(safe-area-inset-bottom))] sm:hidden" />
      <BarreOnglets isAdmin={isAdmin} actionsAdmin={actions} />
    </>
  );
}
