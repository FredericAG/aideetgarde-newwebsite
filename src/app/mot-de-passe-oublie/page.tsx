"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    // Le lien envoyé par email pointe vers `/auth/confirm` (voir
    // src/app/auth/confirm/route.ts), qui établit la session puis redirige
    // vers la page de saisie du nouveau mot de passe — à condition que le
    // modèle d'email "Reset Password" ait été adapté dans la console
    // Supabase (voir README.md). On ignore volontairement l'erreur
    // éventuelle : le message affiché ne doit jamais permettre de deviner
    // si une adresse est inscrite ou non (anti-énumération).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/mon-compte/nouveau-mot-de-passe`,
    });

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Mot de passe oublié
        </h1>

        {sent ? (
          <p className="mt-6 text-sm text-foreground/80">
            Si un compte existe avec cette adresse, un email de
            réinitialisation vient d&apos;être envoyé. Pensez à vérifier vos
            spams.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <p className="text-sm text-foreground/70">
              Indiquez votre adresse email, nous vous enverrons un lien pour
              choisir un nouveau mot de passe.
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-md bg-brand-violet px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm">
          <Link href="/connexion" className="font-medium text-brand-teal underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
