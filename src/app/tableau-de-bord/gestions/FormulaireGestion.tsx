"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { TYPES_GESTION, type Gestion, type TypeGestion } from "@/lib/data";
import { enregistrerGestion, type EtatFormulaireGestion } from "./actions";

const champ =
  "w-full rounded-lg border border-brand-gray/40 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-teal sm:text-sm";
const etiquette = "flex flex-col gap-1 text-sm font-medium";
const aide = "text-xs font-normal text-foreground/60";

function Boutons() {
  const { pending, data } = useFormStatus();
  const intention = data?.get("intention");
  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
      <button
        type="submit"
        name="intention"
        value="envoyer"
        disabled={pending}
        className="btn btn-primaire btn-lg w-full sm:w-auto"
      >
        {pending && intention === "envoyer" ? "Envoi en cours…" : "Envoyer à Aide & Garde"}
      </button>
      <button
        type="submit"
        name="intention"
        value="brouillon"
        disabled={pending}
        className="btn btn-secondaire btn-lg w-full sm:w-auto"
      >
        {pending && intention === "brouillon" ? "Enregistrement…" : "Enregistrer le brouillon"}
      </button>
    </div>
  );
}

/**
 * Formulaire de création / modification d'une gestion par l'abonné
 * (brique 3). Champs contrôlés : en cas d'erreur, rien de ce qui a été
 * saisi n'est perdu.
 *
 * Deux boutons : « Enregistrer le brouillon » (rien n'est transmis, tout
 * reste modifiable) et « Envoyer à Aide & Garde » (contrôle des champs
 * obligatoires, puis validation par Aide & Garde).
 */
export function FormulaireGestion({
  gestion,
  dateParDefaut = "",
  quota,
}: {
  gestion?: Gestion;
  /** Date de début proposée pour une nouvelle gestion (AAAA-MM-JJ). */
  dateParDefaut?: string;
  /** Places de l'abonnement : prévient l'abonné avant l'envoi si c'est complet. */
  quota?: { utilisees: number; total: number };
}) {
  const [etat, action] = useActionState<EtatFormulaireGestion, FormData>(enregistrerGestion, {});
  const [v, setV] = useState({
    type_gestion: (gestion?.type_gestion ?? "garde_enfants") as TypeGestion,
    prenom_salarie: gestion?.prenom_salarie ?? "",
    nom_salarie: gestion?.nom_salarie ?? "",
    date_debut: gestion?.date_debut ?? dateParDefaut,
    type_contrat: gestion?.type_contrat ?? "",
    date_fin_prevue: gestion?.date_fin_prevue ?? "",
    heures: gestion?.heures != null ? String(gestion.heures).replace(".", ",") : "",
    unite_heures: gestion?.unite_heures ?? "semaine",
    salaire_horaire_net:
      gestion?.salaire_horaire_net != null ? String(gestion.salaire_horaire_net).replace(".", ",") : "",
    precisions: gestion?.precisions ?? "",
  });
  const maj =
    (cle: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setV((x) => ({ ...x, [cle]: e.target.value }));

  return (
    <form action={action} className="mt-6 flex flex-col gap-6">
      {gestion && <input type="hidden" name="gestion_id" value={gestion.id} />}

      {quota && quota.utilisees >= quota.total && (
        <p className="rounded-lg border-2 border-brand-jaune bg-brand-jaune/25 p-3 text-sm">
          <strong>Votre abonnement est complet</strong> ({quota.utilisees} / {quota.total} gestions
          en cours ou en attente de validation). Vous pouvez préparer et enregistrer ce brouillon ;
          pour l&apos;envoyer, terminez d&apos;abord une gestion ou contactez Aide &amp; Garde pour
          faire évoluer votre abonnement.
        </p>
      )}

      {etat.message && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {etat.message}
        </p>
      )}

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">Le salarié</legend>
        <h2 className="font-bold text-brand-teal">Le salarié</h2>
        <label className={etiquette}>
          Emploi
          <select name="type_gestion" value={v.type_gestion} onChange={maj("type_gestion")} className={champ}>
            {Object.entries(TYPES_GESTION).map(([cle, libelle]) => (
              <option key={cle} value={cle}>
                {libelle}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={etiquette}>
            Prénom
            <input name="prenom_salarie" value={v.prenom_salarie} onChange={maj("prenom_salarie")} autoComplete="off" className={champ} />
          </label>
          <label className={etiquette}>
            Nom
            <input name="nom_salarie" value={v.nom_salarie} onChange={maj("nom_salarie")} autoComplete="off" className={champ} />
          </label>
        </div>
      </fieldset>

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">Le contrat</legend>
        <h2 className="font-bold text-brand-teal">Le contrat</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={etiquette}>
            Date de début
            <input type="date" name="date_debut" value={v.date_debut} onChange={maj("date_debut")} className={champ} />
          </label>
          <div className={etiquette} role="radiogroup" aria-label="Type de contrat">
            Type de contrat
            <div className="flex gap-3">
              {(["CDI", "CDD"] as const).map((t) => (
                <label
                  key={t}
                  className={`btn flex-1 ${v.type_contrat === t ? "btn-primaire" : "btn-secondaire"}`}
                >
                  <input
                    type="radio"
                    name="type_contrat"
                    value={t}
                    checked={v.type_contrat === t}
                    onChange={maj("type_contrat")}
                    className="sr-only"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>
        {v.type_contrat === "CDD" && (
          <label className={etiquette}>
            Date de fin prévue du CDD
            <input type="date" name="date_fin_prevue" value={v.date_fin_prevue} onChange={maj("date_fin_prevue")} className={champ} />
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={etiquette}>
            Durée de travail
            <div className="flex gap-2">
              <input
                name="heures"
                inputMode="decimal"
                value={v.heures}
                onChange={maj("heures")}
                placeholder="ex. 20"
                aria-label="Nombre d'heures"
                className={`${champ} w-28`}
              />
              <select name="unite_heures" value={v.unite_heures} onChange={maj("unite_heures")} aria-label="Unité" className={champ}>
                <option value="semaine">heures par semaine</option>
                <option value="mois">heures par mois</option>
              </select>
            </div>
          </div>
          <label className={etiquette}>
            Salaire horaire net (€)
            <input
              name="salaire_horaire_net"
              inputMode="decimal"
              value={v.salaire_horaire_net}
              onChange={maj("salaire_horaire_net")}
              placeholder="ex. 12,50"
              className={champ}
            />
            <span className={aide}>Montant net par heure, avant prélèvement à la source.</span>
          </label>
        </div>
        <label className={etiquette}>
          Précisions (facultatif)
          <textarea
            name="precisions"
            rows={3}
            maxLength={2000}
            value={v.precisions}
            onChange={maj("precisions")}
            placeholder="ex. horaires habituels, nombre d'enfants gardés, garde partagée, avantages en nature…"
            className={champ}
          />
        </label>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Boutons />
        <p className="text-xs text-foreground/60">
          <strong>Brouillon</strong> : rien n&apos;est transmis, vous pouvez y revenir quand vous
          voulez. <strong>Envoyer</strong> : Aide &amp; Garde vérifie les informations et démarre
          la gestion ; vous êtes prévenu dès qu&apos;elle est validée. Une gestion envoyée occupe
          une place de votre abonnement.
        </p>
      </div>
    </form>
  );
}
