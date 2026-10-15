import { notFound, redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

/**
 * Garde-fous côté serveur, à appeler en tête de chaque page protégée.
 * Le Proxy (src/proxy.ts) filtre déjà les requêtes sans session, mais on
 * revérifie ici avec `getUser()` : c'est cette vérification, au plus près
 * des données, qui fait foi. Et même si elle avait un défaut, la base de
 * données (RLS, voir supabase/brique2.sql) refuserait quand même de livrer
 * des données qui ne sont pas au bon utilisateur.
 */
export async function requireUser(nextPath: string) {
  if (!isSupabaseConfigured()) {
    redirect(`/connexion?next=${encodeURIComponent(nextPath)}`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(nextPath)}`);
  }
  const profile = await getUserProfile(supabase, user.id);
  return { supabase, user, profile };
}

/**
 * Réservé aux administrateurs. Un non-administrateur reçoit une page 404
 * (et non "accès refusé") : on ne révèle pas l'existence de l'espace admin.
 */
export async function requireAdmin(nextPath: string): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: UserProfile;
}> {
  const { supabase, profile } = await requireUser(nextPath);
  if (!profile || profile.role !== "admin") {
    notFound();
  }
  return { supabase, profile };
}
