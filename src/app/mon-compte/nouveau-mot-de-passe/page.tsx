import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NouveauMotDePasseForm } from "./NouveauMotDePasseForm";

/**
 * Page atteinte après le lien de réinitialisation (voir
 * `src/app/auth/confirm/route.ts`) : à ce stade, la session de récupération
 * a déjà été établie (cookies posés par la route `/auth/confirm`) — il ne
 * reste qu'à demander le nouveau mot de passe.
 */
export default async function NouveauMotDePassePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/mot-de-passe-oublie");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Nouveau mot de passe
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        <NouveauMotDePasseForm />
      </div>
    </div>
  );
}
