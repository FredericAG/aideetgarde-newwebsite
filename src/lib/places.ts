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
      .in("statut", ["envoyee", "en_cours"])
      // Les CDD de remplacement n'occupent pas de place (brique 3d).
      .is("remplace_gestion_id", null),
  ]);
  if (!abo.data) return null;
  return { utilisees: places.count ?? 0, total: abo.data.quota_gestions as number };
}

/**
 * Salariés qu'un CDD de remplacement peut remplacer (brique 3d) : gestions
 * en cours de l'employeur qui ne sont pas elles-mêmes des remplacements.
 */
export async function salariesRemplacables(
  supabase: SupabaseClient,
  employeurId: string,
): Promise<{ id: string; nom: string; type_gestion: string }[]> {
  const { data } = await supabase
    .from("gestions")
    .select("id, prenom_salarie, nom_salarie, type_gestion")
    .eq("employeur_id", employeurId)
    .eq("statut", "en_cours")
    .is("remplace_gestion_id", null)
    .order("nom_salarie");
  return (data ?? []).map((g) => ({
    id: g.id as string,
    nom: `${g.prenom_salarie ?? ""} ${g.nom_salarie ?? ""}`.trim() || "(sans nom)",
    type_gestion: g.type_gestion as string,
  }));
}
