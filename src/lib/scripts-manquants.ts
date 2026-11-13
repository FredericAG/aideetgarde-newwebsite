import type { SupabaseClient } from "@supabase/supabase-js";
import { SCRIPTS_SQL } from "@/lib/scripts-sql";

/**
 * Scripts SQL attendus mais absents du registre (brique13). null : le
 * registre lui-même n'existe pas encore (brique13 à exécuter).
 */
export async function scriptsManquants(db: SupabaseClient): Promise<string[] | null> {
  const { data, error } = await db.from("scripts_sql").select("nom").limit(500);
  if (error) return null;
  const presents = new Set((data ?? []).map((l) => l.nom as string));
  return SCRIPTS_SQL.filter((n) => !presents.has(n));
}
