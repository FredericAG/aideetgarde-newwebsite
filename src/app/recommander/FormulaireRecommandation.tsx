"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { envoyerRecommandation, type EtatRecommandation } from "./actions";

function BoutonEnvoyer() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primaire w-full sm:w-auto">
      {pending ? "Envoi…" : "Envoyer ma recommandation"}
    </button>
  );
}

/** Message proposé, modifiable par l'abonné (signé de son nom). */
export function messageParDefaut(signature: string): string {
  return [
    "J'utilise Aide & Garde pour la gestion de mon salarié à domicile : le contrat, les bulletins de paie chaque mois et les déclarations à l'Urssaf. Je n'ai plus à m'en occuper, et tous mes documents sont disponibles en ligne.",
    "Je pense que cela pourrait vous simplifier la vie, vous aussi. Le lien ci-dessous explique comment cela fonctionne.",
    signature,
  ].join("\n\n");
}

export function FormulaireRecommandation({ signature }: { signature: string }) {
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [message, setMessage] = useState(() => messageParDefaut(signature));
  const [etat, action] = useActionState<EtatRecommandation, FormData>(async (avant, fd) => {
    const res = await envoyerRecommandation(avant, fd);
    // Après un envoi réussi : formulaire vidé pour un autre contact, le
    // message reste celui de l'abonné.
    if (res.ok) {
      setEmail("");
      setPrenom("");
    }
    return res;
  }, {});
  const champEmail = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email de votre contact
          <input
            ref={champEmail}
            name="email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-brand-gray/40 px-3 py-2 text-base font-normal"
            placeholder="prenom.nom@exemple.fr"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <span>
            Son prénom <span className="font-normal text-foreground/60">(facultatif)</span>
          </span>
          <input
            name="prenom"
            autoComplete="off"
            maxLength={60}
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="rounded-md border border-brand-gray/40 px-3 py-2 text-base font-normal"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>
          Votre message <span className="font-normal text-foreground/60">(modifiable)</span>
        </span>
        <span className="text-xs font-normal text-foreground/60">
          Il commencera par « Bonjour {prenom.trim() || "…"}, » et se terminera par un bouton « Découvrir Aide &amp;
          Garde ».
        </span>
        <textarea
          name="message"
          required
          rows={9}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-md border border-brand-gray/40 px-3 py-2 text-base font-normal leading-relaxed"
        />
      </label>
      <button
        type="button"
        onClick={() => setMessage(messageParDefaut(signature))}
        className="self-start text-xs text-brand-teal underline"
      >
        Revenir au message proposé
      </button>

      {etat.erreur && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {etat.erreur}
        </p>
      )}
      {etat.ok && (
        <p role="status" className="rounded-md border border-brand-teal/30 bg-brand-sky-tint/40 p-3 text-sm text-brand-teal">
          {etat.ok}{" "}
          <button type="button" className="underline" onClick={() => champEmail.current?.focus()}>
            Recommander à quelqu&apos;un d&apos;autre
          </button>
        </p>
      )}

      <div>
        <BoutonEnvoyer />
      </div>
      <p className="text-xs text-foreground/60">
        Le message part de la part de vous, avec votre nom ; votre contact peut vous répondre directement. Son adresse
        sert uniquement à cet envoi : Aide &amp; Garde ne la conserve pas.
      </p>
    </form>
  );
}
