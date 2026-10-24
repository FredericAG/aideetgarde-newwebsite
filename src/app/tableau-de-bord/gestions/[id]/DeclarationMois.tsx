"use client";

import { useActionState, useState } from "react";
import { formatDate, formatHeures, type Declaration } from "@/lib/data";
import { envoyerDeclaration, type EtatDeclaration } from "./actions";

export const champ =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal sm:text-sm";

/**
 * « Déclarer le mois » (action principale du cadre Actions), pensée d'abord
 * pour le téléphone : gros champs, clavier numérique pour les heures, un
 * seul bouton. La liste propose tous les mois sans bulletin en ligne depuis
 * le début du contrat (ou depuis le premier mois fixé par Aide & Garde).
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
  const [etat, action, enCours] = useActionState<EtatDeclaration, FormData>(envoyerDeclaration, { statut: "idle" });
  const [periode, setPeriode] = useState(parDefaut);

  if (options.length === 0) {
    return (
      <p className="rounded-md bg-brand-teal/10 p-3 text-sm text-brand-teal">
        Tous les bulletins sont en ligne : rien à déclarer pour le moment.
      </p>
    );
  }

  const existante = declarations.find((d) => d.periode === periode);
  const libelle = options.find((o) => o.valeur === periode)?.libelle ?? "";

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">
        Indiquez les heures travaillées et validez : nous établissons le bulletin. Si les heures sont celles du contrat,
        laissez le champ vide.
      </p>
      <input type="hidden" name="gestion_id" value={gestionId} />
      <input type="hidden" name="periode" value={periode} />

      <label className="flex flex-col gap-1 text-sm font-medium">
        Mois
        <select value={periode} onChange={(e) => setPeriode(e.target.value)} className={champ}>
          {options.map((o) => {
            const envoyee = declarations.some((d) => d.periode === o.valeur);
            return (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
                {envoyee ? " — déclaration envoyée" : ""}
              </option>
            );
          })}
        </select>
      </label>

      {existante && (
        <p className="rounded-md bg-brand-jaune/40 p-3 text-sm text-brand-black">
          Déclaration de {libelle} envoyée le {formatDate(existante.envoyee_le)} ({formatHeures(existante.heures)}) : nous
          établissons le bulletin. Vous pouvez encore la corriger.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Heures travaillées dans le mois (facultatif)
        <input
          key={`h-${periode}`}
          name="heures"
          type="text"
          inputMode="decimal"
          placeholder="ex. 151,67"
          defaultValue={existante?.heures != null ? String(existante.heures).replace(".", ",") : ""}
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

      <button type="submit" disabled={enCours} className="btn btn-primaire w-full sm:w-auto sm:self-start">
        {enCours ? "Envoi en cours…" : existante ? "Mettre à jour ma déclaration" : "Envoyer : le bulletin peut être établi"}
      </button>

      {etat.message && (
        <p aria-live="polite" className={`text-sm ${etat.statut === "erreur" ? "text-red-600" : "text-brand-teal"}`}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
