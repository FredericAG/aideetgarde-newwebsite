"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur. Contrairement au SDK client de Firebase,
 * celui-ci stocke la session (access token + refresh token) dans des
 * cookies plutôt que dans le localStorage — c'est ce qui permet au serveur
 * (Server Components, Server Actions, Proxy) de lire la même session sans
 * bricolage supplémentaire. Voir `src/lib/supabase/server.ts` et
 * `src/proxy.ts`.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
