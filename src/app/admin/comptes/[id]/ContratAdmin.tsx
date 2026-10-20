import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import type { Gestion } from "@/lib/data";
import { modifierContratGestion } from "./actions";

const champ =
  "rounded-md border border-brand-gray/40 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-teal";

/** Formulaire compact de mise à jour du contrat (administrateur). */
export function ContratAdmin({ compteId, gestion: g }: { compteId: string; gestion: Gestion }) {
  return (
    <details className="mt-3">
      <summary className="text-sm font-medium text-brand-teal">
        Modifier les informations du contrat…
      </summary>
      <form action={modifierContratGestion} className="mt-2 flex flex-wrap items-end gap-3 text-xs">
        <input type="hidden" name="compte_id" value={compteId} />
        <input type="hidden" name="gestion_id" value={g.id} />
        <label className="flex flex-col gap-1 font-medium">
          Contrat
          <select name="type_contrat" defaultValue={g.type_contrat ?? ""} className={champ}>
            <option value="">—</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 font-medium">
          Fin du CDD
          <input type="date" name="date_fin_prevue" defaultValue={g.date_fin_prevue ?? ""} className={champ} />
        </label>
        <label className="flex flex-col gap-1 font-medium">
          Heures
          <input name="heures" inputMode="decimal" defaultValue={g.heures ?? ""} className={`${champ} w-20`} />
        </label>
        <label className="flex flex-col gap-1 font-medium">
          Par
          <select name="unite_heures" defaultValue={g.unite_heures ?? "semaine"} className={champ}>
            <option value="semaine">semaine</option>
            <option value="mois">mois</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 font-medium">
          Salaire net / h (€)
          <input
            name="salaire_horaire_net"
            inputMode="decimal"
            defaultValue={g.salaire_horaire_net ?? ""}
            className={`${champ} w-24`}
          />
        </label>
        <label className="flex w-full flex-col gap-1 font-medium">
          Précisions
          <textarea name="precisions" rows={2} defaultValue={g.precisions ?? ""} className={`${champ} w-full`} />
        </label>
        <BoutonEnvoi className="btn btn-secondaire btn-sm" enCours="Enregistrement…">
          Enregistrer
        </BoutonEnvoi>
      </form>
    </details>
  );
}
