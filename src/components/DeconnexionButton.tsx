"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientALaDemande } from "@/lib/supabase/client-a-la-demande";

/**
 * Bouton de déconnexion. Avec Supabase, `signOut()` suffit : le client
 * navigateur écrit directement dans les cookies de session (contrairement à
 * Firebase, pas besoin d'appeler une route API dédiée pour révoquer un
 * cookie serveur distinct).
 *
 * Le module Supabase (250 Ko) n'est chargé qu'au clic (audit du 12/11/2026) :
 * ce bouton figure dans l'en-tête, et un import classique le faisait
 * télécharger par tous les visiteurs, même non connectés.
 */
export function DeconnexionButton({
  className,
  redirection = "/",
}: {
  className?: string;
  /** Page à ouvrir après la déconnexion (par défaut l'accueil). */
  redirection?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = await clientALaDemande();
    await supabase.auth.signOut();
    router.push(redirection);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ??
        "text-sm font-medium text-brand-teal underline disabled:opacity-60"
      }
    >
      {loading ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
