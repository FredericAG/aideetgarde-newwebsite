"use client";

import { useActionState, useState } from "react";
import {
  formatDate,
  formatHeures,
  libelleMois,
  type Declaration,
} from "@/lib/data";
import { envoyerDeclaration, type EtatDeclaration } from "./actions";

const champ =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal";

/**
 * Carte « Déclarer le mois », pensée d'abord pour le téléphone : gros
 * champs, clavier numérique pour les heures, un seul bouton.
 */
export function DeclarationMois({
  gestionId,
  options,
  parDefaut,
  declarations,
}: {
  gestionId: string;
  options: { valeur: string; libelle: string }[];
  parDefaut: string;
  declarations: Declaration[];
}) {
  const [etat, action, enCours] = useActionState<EtatDeclaration, FormData>(
    envoyerDeclaration,
    { statut: "idle" },
  );
  const [periode, setPeriode] = useState(parDefaut);
  const existante = declarations.find((d) => d.periode === periode);
  const verrouillee = existante?.statut === "traitee";

  return (
    <section
      id="declaration"
      className="mt-6 rounded-lg border border-brand-violet/30 bg-brand-violet/5 p-4 sm:p-5"
    >
      <h2 className="font-bold text-brand-violet">Déclarer le mois</h2>
      <p className="mt-1 text-sm text-foreground/70">
        Indiquez les heures travaillées et validez : vous nous signalez ainsi
        que le bulletin peut être établi. Si les heures sont les mêmes que
        prévu au contrat, laissez le champ vide.
      </p>

      <form action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="gestion_id" value={gestionId} />

        <label className="flex flex-col gap-1 text-sm font-medium">
          Mois
          <select
            name="periode"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className={champ}
          >
            {options.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </select>
        </label>

        {existante && (
          <p
            className={`rounded-md p-3 text-sm ${
              verrouillee
                ? "bg-brand-teal/10 text-brand-teal"
                : "bg-brand-jaune/40 text-brand-black"
            }`}
          >
            {verrouillee
              ? `Bulletin de ${libelleMois(periode)} établi le ${formatDate(existante.traitee_le)}.`
              : `Déclaration envoyée le ${formatDate(existante.envoyee_le)} (${formatHeures(existante.heures)}). Vous pouvez encore la corriger.`}
          </p>
        )}

        {!verrouillee && (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Heures travaillées dans le mois (facultatif)
              <input
                key={`h-${periode}`}
                name="heures"
                type="text"
                inputMode="decimal"
                placeholder="ex. 151,67"
                defaultValue={
                  existante?.heures != null ? String(existante.heures).replace(".", ",") : ""
                }
                className={champ}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium">
              Commentaire (absences, congés, heures en plus…)
              <textarea
                key={`c-${periode}`}
                name="commentaire"
                rows={3}
                maxLength={2000}
                defaultValue={existante?.commentaire ?? ""}
                className={champ}
              />
            </label>

            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded-md bg-brand-violet px-4 py-3 text-base font-semibold text-white disabled:opacity-60 sm:w-auto sm:self-start"
            >
              {enCours
                ? "Envoi en cours…"
                : existante
                  ? "Mettre à jour ma déclaration"
                  : "Envoyer : le bulletin peut être établi"}
            </button>
          </>
        )}

        {etat.message && (
          <p
            aria-live="polite"
            className={`text-sm ${etat.statut === "erreur" ? "text-red-600" : "text-brand-teal"}`}
          >
            {etat.message}
          </p>
        )}
      </form>
    </section>
  );
}
