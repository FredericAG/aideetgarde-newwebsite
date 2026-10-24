import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActionsAdmin {
  gestions: number;
  declarations: number;
  avenants: number;
  signalements: number;
  total: number;
}

/**
 * Nombre d'actions qui attendent l'administrateur : gestions à valider,
 * déclarations du mois (et demandes de correction), demandes d'avenant,
 * événements signalés (fin de contrat, accident, arrêt maladie).
 * Affiché en pastille sur « Administration » dans toutes les pages. Calculé
 * une seule fois par affichage (cache) et en parallèle ; une table absente
 * (script pas encore exécuté) compte simplement pour 0.
 */
export const compterActionsAdmin = cache(async (supabase: SupabaseClient): Promise<ActionsAdmin> => {
  const [g, d, a, sg] = await Promise.all([
    supabase.from("gestions").select("id", { count: "exact", head: true }).eq("statut", "envoyee"),
    supabase
      .from("declarations_mensuelles")
      .select("id", { count: "exact", head: true })
      .in("statut", ["envoyee", "modification"]),
    supabase.from("demandes_avenant").select("id", { count: "exact", head: true }).eq("statut", "envoyee"),
    supabase.from("signalements").select("id", { count: "exact", head: true }).eq("statut", "envoyee"),
  ]);
  const gestions = g.error ? 0 : (g.count ?? 0);
  const declarations = d.error ? 0 : (d.count ?? 0);
  const avenants = a.error ? 0 : (a.count ?? 0);
  const signalements = sg.error ? 0 : (sg.count ?? 0);
  return { gestions, declarations, avenants, signalements, total: gestions + declarations + avenants + signalements };
});
