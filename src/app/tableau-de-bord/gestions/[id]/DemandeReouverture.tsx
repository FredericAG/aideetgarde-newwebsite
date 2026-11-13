"use client";

import { useActionState, useState } from "react";
import { formatDate, type Signalement } from "@/lib/data";
import { signalerEvenement, type EtatSignalement } from "./actions";
import { champ } from "./DeclarationMois";

/**
 * Gestion terminée : l'abonné demande à Aide & Garde de la rouvrir (demande
 * du 12/11/2026, script brique3i). La demande rejoint les actions à traiter
 * de l'administration, qui rouvre la gestion ou répond.
 */
export function DemandeReouverture({ gestionId, signalements }: { gestionId: string; signalements: Signalement[] }) {
  const [etat, action, enCours] = useActionState<EtatSignalement, FormData>(signalerEvenement, { statut: "idle" });
  const [ouvert, setOuvert] = useState(false);
  const enAttente = signalements.find((s) => s.type === "reouverture" && s.statut === "envoyee");
  const repondue = signalements.find((s) => s.type === "reouverture" && s.statut === "traitee");

  if (enAttente || etat.statut === "ok") {
    return (
      <p className="mt-6 rounded-lg border-2 border-brand-violet/40 bg-brand-violet/5 p-3 text-sm">
        <strong className="text-brand-violet">Demande de réouverture envoyée</strong>
        {enAttente ? ` le ${formatDate(enAttente.created_at)}` : ""} : Aide &amp; Garde l&apos;examine et vous répond rapidement.
      </p>
    );
  }

  return (
    <section className="mt-6 text-sm" aria-label="Rouvrir cette gestion">
      {repondue?.reponse_admin && (
        <p className="mb-3 rounded-md border-l-4 border-brand-violet bg-white p-3">
          <strong className="text-brand-violet">Réponse à votre demande de réouverture ({formatDate(repondue.traitee_le)})</strong> : «{" "}
          {repondue.reponse_admin} »
        </p>
      )}
      {!ouvert ? (
        <button type="button" onClick={() => setOuvert(true)} className="btn btn-secondaire btn-sm">
          Demander de rouvrir cette gestion
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-3 rounded-lg border border-brand-teal/30 bg-brand-sky-tint/20 p-4">
          <input type="hidden" name="gestion_id" value={gestionId} />
          <input type="hidden" name="type" value="reouverture" />
          <input type="hidden" name="date" value={new Date().toISOString().slice(0, 10)} />
          <div>
            <p className="font-bold text-brand-teal">Rouvrir cette gestion</p>
            <p className="mt-0.5 text-foreground/70">
              Votre salarié reprend le travail chez vous, ou la gestion a été terminée par erreur ? Aide &amp; Garde la
              rouvre ; elle reprend alors une place dans votre abonnement.
            </p>
          </div>
          <label className="flex flex-col gap-1 font-medium">
            Précisions (facultatif)
            <textarea
              name="commentaire"
              rows={2}
              maxLength={2000}
              placeholder="ex. reprise du travail le 5 janvier, mêmes horaires"
              className={champ}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={enCours} className="btn btn-primaire">
              {enCours ? "Envoi en cours…" : "Envoyer la demande"}
            </button>
            <button type="button" onClick={() => setOuvert(false)} className="btn btn-secondaire">
              Annuler
            </button>
          </div>
          {etat.statut === "erreur" && (
            <p role="alert" className="text-red-600">
              {etat.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
