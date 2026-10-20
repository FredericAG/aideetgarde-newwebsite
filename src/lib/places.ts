import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Places de l'abonnement actif d'un employeur : gestions en cours ou
 * envoyées (en attente de validation), comparées au quota. null si aucun
 * abonnement actif.
 */
export async function placesAbonnement(
  supabase: SupabaseClient,
  employeurId: string,
): Promise<{ utilisees: number; total: number } | null> {
  const [abo, places] = await Promise.all([
    supabase
      .from("abonnements")
      .select("quota_gestions")
      .eq("employeur_id", employeurId)
      .eq("statut", "actif")
      .maybeSingle(),
    supabase
      .from("gestions")
      .select("id", { count: "exact", head: true })
      .eq("employeur_id", employeurId)
      .in("statut", ["envoyee", "en_cours"]),
  ]);
  if (!abo.data) return null;
  return { utilisees: places.count ?? 0, total: abo.data.quota_gestions as number };
}
