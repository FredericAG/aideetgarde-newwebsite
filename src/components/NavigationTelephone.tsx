import { BarreOnglets } from "@/components/BarreOnglets";
import { getSessionCourante } from "@/lib/auth";

/**
 * Barre d'onglets du téléphone, affichée seulement à une personne connectée,
 * avec un espace réservé en bas de page pour qu'elle ne cache pas la fin du
 * contenu.
 */
export async function NavigationTelephone() {
  const { user, profile } = await getSessionCourante();
  if (!user) return null;
  return (
    <>
      <div aria-hidden="true" className="h-[calc(4.75rem+env(safe-area-inset-bottom))] sm:hidden" />
      <BarreOnglets isAdmin={profile?.role === "admin"} />
    </>
  );
}
