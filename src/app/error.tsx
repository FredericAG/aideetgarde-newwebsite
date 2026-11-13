"use client";

import { useEffect } from "react";

/**
 * Page affichée quand une erreur inattendue survient (audit du 12/11/2026) :
 * en français, avec quoi faire, au lieu du message technique par défaut.
 */
export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erreur d'affichage :", error);
    // Erreur du navigateur (sans référence) : alerte à Aide & Garde. Celles
    // du serveur (avec référence) sont déjà signalées par le serveur.
    if (!error.digest) {
      void fetch("/api/erreur", {
        method: "POST",
        body: JSON.stringify({ chemin: window.location.pathname, message: String(error.message || error) }),
        keepalive: true,
      }).catch(() => null);
    }
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display font-black text-2xl text-brand-teal">Un problème est survenu</h1>
        <p className="mt-3 text-sm text-foreground/80">
          Cette page n&apos;a pas pu s&apos;afficher. Vos informations ne sont pas perdues. Réessayez dans un instant ;
          si le problème continue, appelez-nous au{" "}
          <a href="tel:+33188320118" className="font-medium text-brand-teal underline">
            01 88 320 118
          </a>
          .
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => reset()} className="btn btn-primaire">
            Réessayer
          </button>
          {/* Lien classique : recharge entièrement la page d'accueil. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="btn btn-secondaire">
            Retour à l&apos;accueil
          </a>
        </div>
        {error.digest && <p className="mt-6 text-xs text-foreground/70">Référence de l&apos;erreur : {error.digest}</p>}
      </div>
    </div>
  );
}
