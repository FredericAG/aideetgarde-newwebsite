import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * `true` une fois que Frédéric a renseigné les variables Supabase (voir
 * .env.example). Sert à afficher un état "déconnecté" plutôt que de planter
 * les pages publiques avant que le projet Supabase existe.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route
 * Handlers). Lit/écrit la session via les cookies de la requête en cours.
 *
 * Le `try/catch` autour de `setAll` n'est pas un oubli : un Server Component
 * ne peut pas écrire de cookies (l'écriture n'est autorisée que depuis un
 * Server Action ou un Route Handler) — l'appel échoue alors silencieusement,
 * sans conséquence, à condition que `src/proxy.ts` rafraîchisse bien la
 * session à chaque requête (voir ce fichier).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : sans effet, cf. commentaire ci-dessus.
          }
        },
      },
    },
  );
}
