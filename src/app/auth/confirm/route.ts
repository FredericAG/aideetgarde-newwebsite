import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée des liens envoyés par email par Supabase Auth
 * (confirmation d'inscription, réinitialisation du mot de passe...).
 *
 * Deux formats de lien sont acceptés :
 * - `?token_hash=...&type=...` : format recommandé, produit par les modèles
 *   d'email personnalisés dans la console Supabase (Authentication > Email
 *   Templates). Il fonctionne même si l'email est ouvert sur un autre
 *   appareil ou un autre navigateur que celui de l'inscription.
 * - `?code=...` : format produit par le lien Supabase par défaut
 *   ({{ .ConfirmationURL }}). Il ne fonctionne que dans le navigateur qui a
 *   lancé l'inscription ; gardé comme solution de repli.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Destination après validation. On n'accepte qu'un chemin interne
  // ("/..." mais pas "//...") pour qu'un lien piégé ne puisse pas renvoyer
  // l'utilisateur vers un autre site.
  const defaultNext =
    type === "recovery" ? "/mon-compte/nouveau-mot-de-passe" : "/tableau-de-bord";
  const rawNext = searchParams.get("next") ?? defaultNext;
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : defaultNext;

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const url = new URL("/connexion", origin);
  url.searchParams.set("erreur", "lien_invalide");
  return NextResponse.redirect(url);
}
