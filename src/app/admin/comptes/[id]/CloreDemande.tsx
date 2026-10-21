"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function Valider({ texte }: { texte: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primaire btn-sm">
      {pending ? "Enregistrement…" : texte}
    </button>
  );
}

/**
 * « Solder » une demande de l'abonné sans faire ce qui est demandé (ou sans
 * document) : petit formulaire dépliable avec un commentaire facultatif,
 * transmis à l'abonné (notification, email et affichage dans son espace).
 */
export function CloreDemande({
  action,
  champs,
  libelle,
  bouton,
  aide,
}: {
  action: (fd: FormData) => Promise<void>;
  champs: Record<string, string>;
  /** Texte du lien qui ouvre le formulaire. */
  libelle: string;
  /** Texte du bouton de validation. */
  bouton: string;
  /** Explication de la conséquence pour l'abonné. */
  aide: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs font-medium text-brand-teal underline"
      >
        {libelle}
      </button>
    );
  }
  return (
    <form
      action={action}
      className="flex w-full flex-col gap-2 rounded-lg border border-brand-violet/40 bg-white p-3 text-left sm:max-w-md"
    >
      {Object.entries(champs).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-xs text-foreground/70">{aide}</p>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Commentaire pour l&apos;abonné (facultatif)
        <textarea
          name="commentaire"
          rows={2}
          maxLength={2000}
          placeholder="Votre réponse, visible par l'abonné…"
          className="rounded-md border border-brand-gray/40 bg-white px-2 py-1.5 text-sm font-normal outline-none focus:border-brand-teal"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Valider texte={bouton} />
        <button type="button" onClick={() => setOuvert(false)} className="btn btn-secondaire btn-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}
