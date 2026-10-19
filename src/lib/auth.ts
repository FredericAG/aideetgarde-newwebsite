import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

/**
 * Identité de la personne connectée, calculée UNE SEULE FOIS par affichage
 * de page (grâce à `cache` de React), puis partagée entre l'en-tête du site
 * et la page elle-même. Avant, chacun la redemandait à Supabase de son côté.
 *
 * `getClaims()` vérifie la signature du jeton de session localement (clés
 * publiques Supabase mises en cache) au lieu d'interroger le serveur
 * d'authentification à chaque fois comme `getUser()` : c'est un aller-retour
 * réseau de moins par page, recommandé par Supabase. La sécurité reste
 * assurée : un jeton falsifié est rejeté, et la base (RLS) revérifie le
 * jeton à chaque lecture de données.
 */
export const getSessionCourante = cache(async () => {
  if (!isSupabaseConfigured()) {
    return { supabase: null, user: null, profile: null } as const;
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) {
    return { supabase, user: null, profile: null } as const;
  }
  const user = {
    id: claims.sub as string,
    email: (claims.email as string | undefined) ?? null,
  };
  const profile = await getUserProfile(supabase, user.id).catch(() => null);
  return { supabase, user, profile };
});

/**
 * Garde-fou côté serveur, à appeler en tête de chaque page protégée.
 * Le Proxy (src/proxy.ts) filtre déjà les requêtes sans session ; la base
 * de données (RLS) constitue la dernière barrière.
 */
export async function requireUser(nextPath: string): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string | null };
  profile: UserProfile | null;
}> {
  const { supabase, user, profile } = await getSessionCourante();
  if (!supabase || !user) {
    redirect(`/connexion?next=${encodeURIComponent(nextPath)}`);
  }
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
