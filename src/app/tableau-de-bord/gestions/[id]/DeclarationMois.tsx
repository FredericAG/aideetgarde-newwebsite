"use client";

import { useActionState, useState } from "react";
import {
  formatDate,
  formatHeures,
  libelleMois,
  type Declaration,
} from "@/lib/data";
import {
  demanderModification,
  envoyerDeclaration,
  type EtatDeclaration,
} from "./actions";

const champ =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal";

/**
 * Carte « Déclarer le mois », pensée d'abord pour le téléphone : gros
 * champs, clavier numérique pour les heures, un seul bouton.
 * Une fois le bulletin en ligne, elle propose de demander une modification.
 */
export function DeclarationMois({
  gestionId,
  options,
  parDefaut,
  declarations,
  periodesAvecBulletin,
}: {
  gestionId: string;
  options: { valeur: string; libelle: string }[];
  parDefaut: string;
  declarations: Declaration[];
  periodesAvecBulletin: string[];
}) {
  const [etat, action, enCours] = useActionState<EtatDeclaration, FormData>(
    envoyerDeclaration,
    { statut: "idle" },
  );
  const [etatModif, actionModif, enCoursModif] = useActionState<EtatDeclaration, FormData>(
    demanderModification,
    { statut: "idle" },
  );
  const [periode, setPeriode] = useState(parDefaut);
  const [demandeOuverte, setDemandeOuverte] = useState(false);

  const existante = declarations.find((d) => d.periode === periode);
  const bulletinEnLigne = periodesAvecBulletin.includes(periode);
  const modificationEnCours = existante?.statut === "modification";
  const formulaireOuvert = !bulletinEnLigne && !modificationEnCours;

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

      <label className="mt-4 flex flex-col gap-1 text-sm font-medium">
        Mois
        <select
          value={periode}
          onChange={(e) => {
            setPeriode(e.target.value);
            setDemandeOuverte(false);
          }}
          className={champ}
        >
          {options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      </label>

      {/* Modification déjà demandée, en attente du bulletin corrigé */}
      {modificationEnCours && (
        <p className="mt-4 rounded-md bg-brand-jaune/40 p-3 text-sm text-brand-black">
          Modification du bulletin de {libelleMois(periode)} demandée le{" "}
          {formatDate(existante?.modification_demandee_le)}
          {existante?.motif_modification ? ` : « ${existante.motif_modification} »` : ""}.
          Nous mettons en ligne un bulletin corrigé dès que possible.
        </p>
      )}

      {/* Bulletin en ligne : possibilité de demander une modification */}
      {bulletinEnLigne && !modificationEnCours && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="rounded-md bg-brand-teal/10 p-3 text-sm text-brand-teal">
            Le bulletin de {libelleMois(periode)} est en ligne
            {existante?.traitee_le ? ` (établi le ${formatDate(existante.traitee_le)})` : ""} :
            retrouvez-le dans vos documents ci-dessous.
          </p>
          {!demandeOuverte ? (
            <button
              type="button"
              onClick={() => setDemandeOuverte(true)}
              className="w-full rounded-md border border-brand-violet px-4 py-3 text-base font-semibold text-brand-violet sm:w-auto sm:self-start"
            >
              Demander une modification du bulletin
            </button>
          ) : (
            <form action={actionModif} className="flex flex-col gap-3">
              <input type="hidden" name="gestion_id" value={gestionId} />
              <input type="hidden" name="periode" value={periode} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                Que faut-il corriger ?
                <textarea
                  name="motif"
                  rows={3}
                  required
                  minLength={3}
                  maxLength={2000}
                  placeholder="ex. il manque 4 heures le 12, une journée de congé n'apparaît pas…"
                  className={champ}
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={enCoursModif}
                  className="w-full rounded-md bg-brand-violet px-4 py-3 text-base font-semibold text-white disabled:opacity-60 sm:w-auto"
                >
                  {enCoursModif ? "Envoi en cours…" : "Envoyer la demande"}
                </button>
                <button
                  type="button"
                  onClick={() => setDemandeOuverte(false)}
                  className="w-full rounded-md border border-brand-gray/40 px-4 py-3 text-base sm:w-auto"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
          {etatModif.message && (
            <p
              aria-live="polite"
              className={`text-sm ${etatModif.statut === "erreur" ? "text-red-600" : "text-brand-teal"}`}
            >
              {etatModif.message}
            </p>
          )}
        </div>
      )}

      {/* Déclaration du mois */}
      {formulaireOuvert && (
        <form action={action} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="gestion_id" value={gestionId} />
          <input type="hidden" name="periode" value={periode} />

          {existante && (
            <p className="rounded-md bg-brand-jaune/40 p-3 text-sm text-brand-black">
              Déclaration envoyée le {formatDate(existante.envoyee_le)} (
              {formatHeures(existante.heures)}). Vous pouvez encore la corriger.
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

          {etat.message && (
            <p
              aria-live="polite"
              className={`text-sm ${etat.statut === "erreur" ? "text-red-600" : "text-brand-teal"}`}
            >
              {etat.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
