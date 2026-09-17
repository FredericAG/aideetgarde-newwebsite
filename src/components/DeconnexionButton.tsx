"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Bouton de déconnexion. Avec Supabase, `signOut()` suffit : le client
 * navigateur écrit directement dans les cookies de session (contrairement à
 * Firebase, pas besoin d'appeler une route API dédiée pour révoquer un
 * cookie serveur distinct).
 */
export function DeconnexionButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
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
