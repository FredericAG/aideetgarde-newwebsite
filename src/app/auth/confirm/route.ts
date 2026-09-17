import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée des liens envoyés par email par Supabase Auth (ici : le
 * lien de réinitialisation de mot de passe). Contrairement à Firebase, qui
 * héberge lui-même une page de traitement de ces liens, Supabase attend que
 * l'application fournisse cette route : voir le modèle d'email
 * "Reset Password" à personnaliser dans la console Supabase (Authentication
 * > Email Templates) pour qu'il pointe ici avec `token_hash`, `type` et
 * `next` en paramètres plutôt que vers l'URL Supabase par défaut.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/mon-compte/nouveau-mot-de-passe";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const url = new URL("/connexion", origin);
  url.searchParams.set("erreur", "lien_invalide");
  return NextResponse.redirect(url);
}
