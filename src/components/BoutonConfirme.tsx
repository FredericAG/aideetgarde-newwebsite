"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

/**
 * Bouton d'envoi d'un formulaire qui demande d'abord confirmation
 * (« Oui / Non ») dans une fenêtre aux couleurs du site, pour éviter les
 * fausses manipulations : suppressions, fin de gestion, résiliation.
 * Le formulaire n'est envoyé qu'après « Oui ». Touche Échap = « Non ».
 */
export function BoutonConfirme({
  children,
  className,
  enCours = "En cours…",
  question,
  precision,
  oui = "Oui, confirmer",
  libelle,
}: {
  children: React.ReactNode;
  className?: string;
  enCours?: React.ReactNode;
  /** ex. « Supprimer ce document ? » */
  question: string;
  /** Conséquence de l'action, affichée sous la question. */
  precision?: string;
  oui?: string;
  /** Texte lu par les lecteurs d'écran et affiché au survol (bouton-icône). */
  libelle?: string;
}) {
  const fenetre = useRef<HTMLDialogElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();

  return (
    <>
      <button
        ref={bouton}
        type="button"
        disabled={pending}
        aria-busy={pending}
        aria-label={libelle}
        title={libelle}
        onClick={() => fenetre.current?.showModal()}
        className={`${className ?? ""} disabled:opacity-60`}
      >
        {pending ? enCours : children}
      </button>
      <dialog
        ref={fenetre}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border-2 border-brand-jaune bg-white p-5 text-left text-foreground shadow-xl backdrop:bg-brand-black/40"
      >
        <p className="font-bold text-brand-teal">{question}</p>
        {precision && <p className="mt-2 text-sm text-foreground/80">{precision}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => fenetre.current?.close()}
            className="btn btn-secondaire"
          >
            Non, annuler
          </button>
          <button
            type="button"
            onClick={() => {
              fenetre.current?.close();
              bouton.current?.form?.requestSubmit();
            }}
            className="btn btn-danger"
          >
            {oui}
          </button>
        </div>
      </dialog>
    </>
  );
}
