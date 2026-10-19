"use client";

import { useFormStatus } from "react-dom";

/**
 * Bouton d'envoi d'un formulaire qui réagit IMMÉDIATEMENT au clic : il se
 * désactive et affiche « … en cours » pendant que le serveur travaille.
 * Sans ce retour visuel, un clic paraît ignoré et on a tendance à cliquer
 * plusieurs fois.
 */
export function BoutonEnvoi({
  children,
  className,
  enCours = "En cours…",
}: {
  children: React.ReactNode;
  className?: string;
  enCours?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:opacity-60`}
    >
      {pending ? enCours : children}
    </button>
  );
}
