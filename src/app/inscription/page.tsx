"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export default function InscriptionPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [accepteCgu, setAccepteCgu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!accepteCgu) {
      setError(
        "Merci d'accepter les conditions d'utilisation et la politique de confidentialité.",
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();
    // Le profil (table `profiles`) est créé automatiquement par un trigger
    // Postgres à partir de ces métadonnées (voir supabase/schema.sql) — pas
    // besoin d'un appel séparé comme avec Firebase/Firestore.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { prenom, nom } },
    });

    if (signUpError) {
      setError(authErrorMessage(signUpError));
      setLoading(false);
      return;
    }

    router.push("/mon-compte");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Créer un compte
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Espace employeur Aide &amp; Garde.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom">
              <input
                type="text"
                required
                autoComplete="given-name"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Nom">
              <input
                type="text"
                required
                autoComplete="family-name"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Mot de passe">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Confirmer le mot de passe">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={inputClass}
            />
          </Field>

          <label className="flex items-start gap-2 text-sm text-foreground/70">
            <input
              type="checkbox"
              checked={accepteCgu}
              onChange={(e) => setAccepteCgu(e.target.checked)}
              className="mt-1"
            />
            <span>
              J&apos;accepte les conditions d&apos;utilisation et la{" "}
              <Link href="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-brand-violet px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Création en cours…" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-sm text-foreground/70">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-medium text-brand-teal underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
