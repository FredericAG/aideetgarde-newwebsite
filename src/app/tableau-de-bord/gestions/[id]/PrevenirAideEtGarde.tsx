"use client";

import { useActionState } from "react";
import {
  DATES_SIGNALEMENT,
  formatDate,
  libelleSignalement,
  type ModeFinContrat,
  type Signalement,
  type TypeSignalement,
} from "@/lib/data";
import { signalerEvenement, type EtatSignalement } from "./actions";
import { champ } from "./DeclarationMois";

/**
 * « Prévenir Aide & Garde » (brique 3e) : l'abonné indique la date, et un
 * commentaire s'il le souhaite. La demande rejoint les actions à traiter de
 * l'administration ; l'abonné voit qu'elle est en cours, puis la réponse.
 */
export function PrevenirAideEtGarde({
  gestionId,
  type,
  precision = "",
  signalements,
  titre,
  texte,
  placeholder,
}: {
  gestionId: string;
  type: TypeSignalement;
  precision?: ModeFinContrat | "";
  /** Signalements de la gestion (tous types), du plus récent au plus ancien. */
  signalements: Signalement[];
  titre: string;
  texte: string;
  placeholder?: string;
}) {
  const [etat, action, enCours] = useActionState<EtatSignalement, FormData>(signalerEvenement, { statut: "idle" });
  const enAttente = signalements.find((s) => s.type === type && s.statut === "envoyee");
  // La page ne transmet que les signalements traités depuis moins de 60 jours.
  const traite = signalements.find((s) => s.type === type && s.statut === "traitee");

  if (enAttente || etat.statut === "ok") {
    return (
      <div className="rounded-lg border-2 border-brand-violet/40 bg-brand-violet/5 p-3 text-sm">
        <p className="font-bold text-brand-violet">Aide &amp; Garde est prévenue</p>
        <p className="mt-1 text-foreground/80">
          {enAttente
            ? `${libelleSignalement(enAttente)}, ${DATES_SIGNALEMENT[type].toLowerCase()} : ${formatDate(enAttente.date_evenement)} (signalé le ${formatDate(enAttente.created_at)}). Nous traitons votre demande et vous prévenons dès que c'est prêt.`
            : etat.message}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-brand-teal/30 bg-brand-sky-tint/20 p-4 text-sm">
      <input type="hidden" name="gestion_id" value={gestionId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="precision" value={precision} />
      <div>
        <p className="font-bold text-brand-teal">{titre}</p>
        <p className="mt-0.5 text-foreground/70">{texte}</p>
      </div>
      {traite && (
        <p className="rounded-md border-l-4 border-brand-violet bg-white p-3">
          <strong className="text-brand-violet">Traité le {formatDate(traite.traitee_le)}</strong>
          {traite.reponse_admin ? ` : « ${traite.reponse_admin} »` : "."}
        </p>
      )}
      <label className="flex flex-col gap-1 font-medium">
        {DATES_SIGNALEMENT[type]}
        <input type="date" name="date" required className={`${champ} sm:w-56`} />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Précisions (facultatif)
        <textarea name="commentaire" rows={2} maxLength={2000} placeholder={placeholder} className={champ} />
      </label>
      <button type="submit" disabled={enCours} className="btn btn-primaire w-full sm:w-auto sm:self-start">
        {enCours ? "Envoi en cours…" : "Prévenir Aide & Garde"}
      </button>
      {etat.statut === "erreur" && (
        <p role="alert" className="text-red-600">
          {etat.message}
        </p>
      )}
    </form>
  );
}
