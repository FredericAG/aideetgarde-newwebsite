import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Gestion } from "@/lib/data";

export type GestionNav = Pick<Gestion, "id" | "prenom_salarie" | "nom_salarie" | "statut" | "date_debut"> & {
  /** Documents en ligne pas encore ouverts. */
  nouveaux: number;
  /** Date du document le plus récent (ISO), "" s'il n'y en a pas. */
  dernierDepot: string;
};

/**
 * Gestions de l'abonné pour la rangée de pastilles de « Mes gestions » :
 * en cours d'abord, puis en préparation, puis terminées (les plus récentes
 * d'abord), avec le nombre de nouveaux documents de chacune.
 */
export async function listerMesGestions(supabase: SupabaseClient, employeurId: string): Promise<GestionNav[]> {
  const [gRes, dRes] = await Promise.all([
    supabase
      .from("gestions")
      .select("id, prenom_salarie, nom_salarie, statut, date_debut")
      .eq("employeur_id", employeurId)
      .order("date_debut", { ascending: false }),
    supabase
      .from("documents")
      .select("gestion_id, created_at, consulte_le, storage_path")
      .eq("employeur_id", employeurId),
  ]);
  const docs = (dRes.data ?? []) as { gestion_id: string; created_at: string; consulte_le: string | null; storage_path: string | null }[];
  const rang: Record<Gestion["statut"], number> = { en_cours: 0, brouillon: 1, envoyee: 1, terminee: 2 };
  return ((gRes.data ?? []) as GestionNav[])
    .map((g) => {
      const siens = docs.filter((d) => d.gestion_id === g.id);
      return {
        ...g,
        nouveaux: siens.filter((d) => d.storage_path && !d.consulte_le).length,
        dernierDepot: siens.reduce((m, d) => (d.created_at > m ? d.created_at : m), ""),
      };
    })
    .sort((a, b) => rang[a.statut] - rang[b.statut]);
}

/**
 * Gestion ouverte par défaut dans « Mes gestions » : celle qui a un nouveau
 * document, sinon celle dont le dernier document est le plus récent, sinon
 * la première en cours, sinon la première.
 */
export function gestionParDefaut(liste: GestionNav[]): GestionNav | null {
  return (
    liste.find((g) => g.nouveaux > 0) ??
    [...liste].filter((g) => g.dernierDepot).sort((a, b) => b.dernierDepot.localeCompare(a.dernierDepot))[0] ??
    liste.find((g) => g.statut === "en_cours") ??
    liste[0] ??
    null
  );
}
