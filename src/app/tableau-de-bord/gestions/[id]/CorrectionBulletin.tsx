"use client";

import { useActionState, useState } from "react";
import { LienTelechargement } from "@/components/LienTelechargement";
import { formatDate, libelleMois, type Declaration } from "@/lib/data";
import { demanderModification, type EtatDeclaration } from "./actions";
import { champ } from "./DeclarationMois";

/**
 * « Corriger un bulletin » : choix d'un bulletin en ligne, téléchargement et
 * demande de correction (motif obligatoire). Reprend ce que proposait la
 * carte « Déclarer le mois » quand le bulletin du mois choisi était en ligne.
 */
export function CorrectionBulletin({
  gestionId,
  bulletins,
  declarations,
}: {
  gestionId: string;
  /** Bulletins en ligne, du plus récent au plus ancien. */
  bulletins: { periode: string; documentId: string }[];
  declarations: Declaration[];
}) {
  const [etat, action, enCours] = useActionState<EtatDeclaration, FormData>(demanderModification, { statut: "idle" });
  const [periode, setPeriode] = useState(bulletins[0]?.periode ?? "");

  if (bulletins.length === 0) {
    return <p className="text-sm text-foreground/70">Aucun bulletin en ligne pour le moment.</p>;
  }

  const bulletin = bulletins.find((b) => b.periode === periode) ?? bulletins[0];
  const existante = declarations.find((d) => d.periode === bulletin.periode);
  const enAttente = existante?.statut === "modification";

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Bulletin
        <select value={bulletin.periode} onChange={(e) => setPeriode(e.target.value)} className={champ}>
          {bulletins.map((b) => (
            <option key={b.periode} value={b.periode}>
              {libelleMois(b.periode)}
            </option>
          ))}
        </select>
      </label>

      <LienTelechargement documentId={bulletin.documentId} className="btn btn-secondaire btn-sm w-full sm:w-auto sm:self-start">
        ⬇ Télécharger le bulletin de {libelleMois(bulletin.periode)}
      </LienTelechargement>

      {enAttente ? (
        <p className="rounded-md bg-brand-jaune/40 p-3 text-sm text-brand-black">
          Correction demandée le {formatDate(existante?.modification_demandee_le)}
          {existante?.motif_modification ? ` : « ${existante.motif_modification} »` : ""}. Nous mettons en ligne un
          bulletin corrigé dès que possible.
        </p>
      ) : (
        <>
          {existante?.cloturee_le && (
            <p className="rounded-md border-l-4 border-brand-violet bg-white p-3 text-sm">
              <strong className="text-brand-violet">Réponse à votre précédente demande</strong> (
              {formatDate(existante.cloturee_le)}) : le bulletin est maintenu sans changement.
              {existante.reponse_admin && <span className="mt-1 block text-foreground/80">« {existante.reponse_admin} »</span>}
            </p>
          )}
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="gestion_id" value={gestionId} />
            <input type="hidden" name="periode" value={bulletin.periode} />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Que faut-il corriger ?
              <textarea
                key={bulletin.periode}
                name="motif"
                rows={3}
                required
                minLength={3}
                maxLength={2000}
                placeholder="ex. il manque 4 heures le 12, une journée de congé n'apparaît pas…"
                className={champ}
              />
            </label>
            <button type="submit" disabled={enCours} className="btn btn-primaire w-full sm:w-auto sm:self-start">
              {enCours ? "Envoi en cours…" : "Demander la correction"}
            </button>
          </form>
        </>
      )}

      {etat.message && (
        <p aria-live="polite" className={`text-sm ${etat.statut === "erreur" ? "text-red-600" : "text-brand-teal"}`}>
          {etat.message}
        </p>
      )}
    </div>
  );
}
