import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (anciennement "Middleware", renommé en Next.js 16). Contrairement à
 * la version Firebase, il ne se contente pas de vérifier la présence d'un
 * cookie : Supabase a besoin qu'on rafraîchisse la session à CHAQUE requête
 * (sans quoi les utilisateurs seraient déconnectés de façon aléatoire dès
 * que l'access token expire — piège documenté par Supabase elle-même). Le
 * matcher couvre donc quasiment toutes les routes, pas seulement les pages
 * d'authentification.
 *
 * `supabase.auth.getUser()` (jamais `getSession()`) revérifie le jeton
 * auprès du serveur Supabase à chaque appel : c'est ce qui rend ce contrôle
 * fiable pour protéger une route, contrairement à une simple lecture locale
 * du cookie.
 */
export async function proxy(request: NextRequest) {
  // Tant que le projet Supabase n'est pas configuré (variables d'env
  // absentes — cas du tout premier déploiement, avant que Frédéric ait créé
  // le projet), on laisse passer sans bloquer : mieux vaut un site public
  // qui fonctionne sans espace "Mon compte" protégé qu'un 500 sur toutes
  // les pages. Ce garde-fou doit disparaître de lui-même dès que les
  // variables sont renseignées (voir .env.example / README.md).
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne rien exécuter entre createServerClient et getUser() : c'est la
  // recommandation officielle Supabase, pour éviter des déconnexions
  // aléatoires difficiles à diagnostiquer.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith("/mon-compte");
  const isAuthRoute =
    pathname.startsWith("/connexion") || pathname.startsWith("/inscription");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/mon-compte";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Important : on renvoie l'objet réponse tel quel (voir commentaire
  // Supabase) pour ne jamais perdre les cookies rafraîchis en route.
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
