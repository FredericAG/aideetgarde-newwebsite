"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { OBJETS_AVENANT, formatDate, type DemandeAvenant as Demande } from "@/lib/data";
import { demanderAvenant, type EtatAvenant } from "../actions";

const champ =
  "w-full rounded-lg border border-brand-gray/40 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-teal sm:text-sm";

function BoutonEnvoyer() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primaire btn-lg w-full sm:w-auto">
      {pending ? "Envoi en cours…" : "Envoyer la demande"}
    </button>
  );
}

/**
 * « Demander un avenant » (cadre Actions) : demande d'avenant sur une
 * gestion en cours (brique 3b). Une seule demande en attente à la fois ;
 * elle est close automatiquement quand Aide & Garde dépose l'avenant.
 */
export function DemandeAvenant({
  gestionId,
  enAttente,
}: {
  gestionId: string;
  /** Demande déjà envoyée et pas encore traitée, s'il y en a une. */
  enAttente: Demande | null;
}) {
  const [etat, action] = useActionState<EtatAvenant, FormData>(demanderAvenant, {});

  if (enAttente || etat.ok) {
    return (
      <div className="rounded-xl border-2 border-brand-violet/40 bg-brand-violet/5 p-4 text-sm">
        <p className="font-bold text-brand-violet">Demande d&apos;avenant en cours</p>
        <p className="mt-1 text-foreground/80">
          {etat.ok && !enAttente
            ? etat.message
            : `Envoyée le ${formatDate(enAttente?.created_at)} : Aide & Garde prépare l'avenant et vous prévient dès qu'il est disponible.`}
        </p>
        {enAttente && (
          <p className="mt-2 text-foreground/70">
            {enAttente.objets.map((o) => OBJETS_AVENANT[o] ?? o).join(" · ")}
            {enAttente.date_effet ? ` — à partir du ${formatDate(enAttente.date_effet)}` : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-foreground/70">
        Garde partagée, horaires, adresse, taux horaire… Signalez-le : nous
        préparons l&apos;avenant au contrat de travail.
      </p>
      {(
        <form action={action} className="mt-4 flex flex-col gap-4 text-sm">
          <input type="hidden" name="gestion_id" value={gestionId} />
          {etat.message && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
              {etat.message}
            </p>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">Qu&apos;est-ce qui change ?</legend>
            {Object.entries(OBJETS_AVENANT).map(([cle, libelle]) => (
              <label key={cle} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="objets"
                  value={cle}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-violet)]"
                />
                {libelle}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 font-medium">
            À partir de quand ? (facultatif)
            <input type="date" name="date_effet" className={`${champ} sm:w-56`} />
          </label>
          <label className="flex flex-col gap-1 font-medium">
            Décrivez le changement
            <textarea
              name="description"
              rows={3}
              required
              minLength={3}
              maxLength={2000}
              placeholder="ex. à partir du 1er décembre, garde partagée avec la famille Martin, 3 jours par semaine"
              className={champ}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <BoutonEnvoyer />
          </div>
        </form>
      )}
    </div>
  );
}
