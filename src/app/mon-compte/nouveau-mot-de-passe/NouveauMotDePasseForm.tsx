"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export function NouveauMotDePasseForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(authErrorMessage(updateError));
      setLoading(false);
      return;
    }

    router.push("/mon-compte");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nouveau mot de passe
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Confirmer le mot de passe
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-md bg-brand-violet px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Enregistrement…" : "Valider le nouveau mot de passe"}
      </button>
    </form>
  );
}
