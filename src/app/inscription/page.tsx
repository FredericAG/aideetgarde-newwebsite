"use client";

import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { MESSAGE_RESEAU, withTimeout } from "@/lib/with-timeout";

export default function InscriptionPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepteCgu, setAccepteCgu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!accepteCgu) {
      setError(
        "Merci d'accepter les conditions générales de vente.",
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      // Le profil (table `profiles`) est créé automatiquement par un trigger
      // Postgres à partir de ces métadonnées (voir supabase/schema.sql) — pas
      // besoin d'un appel séparé comme avec Firebase/Firestore.
      const { data, error: signUpError } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { prenom, nom },
            // Le lien de confirmation renverra sur CE site (production ou
            // prévisualisation), à condition que l'adresse figure dans
            // Supabase > Authentication > URL Configuration > Redirect URLs.
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=/tableau-de-bord`,
          },
        }),
      );

      if (signUpError) {
        setError(authErrorMessage(signUpError));
        setLoading(false);
        return;
      }

      // Pas de session = la confirmation d'email est activée côté Supabase :
      // le compte existe mais l'utilisateur doit d'abord cliquer sur le lien
      // reçu par email.
      if (!data.session) {
        setInfo(email);
        setLoading(false);
        return;
      }

      router.push("/tableau-de-bord");
      router.refresh();
    } catch (e) {
      // Variables d'environnement absentes, projet Supabase en pause,
      // réseau coupé, délai dépassé… : on affiche toujours un message
      // plutôt que de laisser le bouton figé.
      console.error("Inscription impossible :", e);
      setError(MESSAGE_RESEAU);
      setLoading(false);
    }
  }

  // Compte créé, email de confirmation envoyé : écran dédié, une seule
  // chose à faire.
  if (info) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <p aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-jaune text-2xl">
            ✉
          </p>
          <h1 className="mt-4 font-display font-black text-2xl text-brand-teal">Vérifiez votre boîte mail</h1>
          <p className="mt-3 text-foreground/80">
            Votre compte est créé. Nous venons d&apos;envoyer un lien de confirmation à <strong>{info}</strong> :
            cliquez dessus pour accéder à votre espace.
          </p>
          <p className="mt-3 text-sm text-foreground/60">
            Rien reçu d&apos;ici quelques minutes ? Regardez dans les courriers indésirables, ou appelez-nous au
            01 88 320 118.
          </p>
          <Link href="/connexion" className="btn btn-secondaire mt-6">
            J&apos;ai confirmé, je me connecte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12 sm:py-16">
      <div className="grid w-full max-w-4xl items-start gap-10 md:grid-cols-[1fr_22rem]">
        {/* Rappel de ce que l'on obtient : rassure sans allonger le formulaire */}
        <aside className="order-2 md:order-1 md:pt-14">
          <p className="font-display font-black text-xl text-brand-teal">Dans 2 minutes, votre espace est prêt.</p>
          <ul className="mt-4 space-y-3 text-sm text-foreground/80">
            {[
              ["Toutes les démarches faites à votre place", "Contrat, bulletins de paie, déclarations, fin de contrat."],
              ["Sans engagement", "Abonnement mensuel, résiliable en ligne à tout moment."],
              ["Vos données protégées", "Hébergées en France ; vos documents restent privés."],
              ["Un conseiller qui vous répond", "Au 01 88 320 118, appel non surtaxé."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden="true" className="mt-0.5 font-bold text-brand-teal">✓</span>
                <span>
                  <strong className="block text-brand-black">{t}</strong>
                  {d}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="order-1 md:order-2">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Créer mon compte
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Gratuit. Vous choisirez votre formule ensuite.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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

          <Field label="Mot de passe" aide="8 caractères au moins. L'œil permet de vérifier ce que vous tapez.">
            <ChampMotDePasse
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              J&apos;accepte les{" "}
              <Link href="/cgv" className="underline" target="_blank">
                conditions générales de vente
              </Link>{" "}
              et j&apos;ai lu la{" "}
              <Link href="/confidentialite" className="underline" target="_blank">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primaire mt-2"
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
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal";

function Field({
  label,
  aide,
  children,
}: {
  label: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {aide && <span className="text-xs font-normal text-foreground/60">{aide}</span>}
    </label>
  );
}
