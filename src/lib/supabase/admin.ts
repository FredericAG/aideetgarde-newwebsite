import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase « serveur », avec la clé secrète (SUPABASE_SECRET_KEY).
 *
 * Il ne dépend d'aucune session : il sert UNIQUEMENT aux traitements où
 * personne n'est connecté (notification de paiement envoyée par Systempay,
 * tâche quotidienne des échéances) et à la création d'une commande de
 * paiement, après vérification de l'identité de l'abonné.
 *
 * La clé secrète contourne les règles d'accès (RLS) : elle ne doit jamais
 * être exposée au navigateur (pas de préfixe NEXT_PUBLIC_, type « Secret »
 * dans Vercel). `server-only` fait échouer la compilation si ce fichier est
 * importé par erreur dans un composant client.
 */
export function clientServeur(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SECRET_KEY;
  if (!url || !cle) return null;
  return createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
