import {
  TYPES_GESTION,
  formatDate,
  formatDuree,
  formatSalaireHoraire,
  nomSalarie,
  type Gestion,
} from "@/lib/data";
import { CHAMPS, ETAPES, champVisible, valeurLisible, type ContexteChamps } from "@/lib/contrat/champs";
import { categorie, categorieDeLaGestion, echelleEnRomain, emploiRepere } from "@/lib/contrat/classification";

/** Récapitulatif des informations du contrat d'une gestion (lecture seule). */
export function RecapGestion({ gestion: g }: { gestion: Gestion }) {
  const lignes: [string, string][] = [
    ["Salarié", nomSalarie(g)],
    ["Emploi", (() => {
      const e = emploiRepere(g.config?.emploi_repere);
      return e ? `${e.libelle} (niveau ${echelleEnRomain(e.echelle)})` : TYPES_GESTION[g.type_gestion];
    })()],
    ["Début", formatDate(g.date_debut)],
    [
      "Contrat",
      g.type_contrat
        ? g.type_contrat === "CDD"
          ? `CDD jusqu'au ${formatDate(g.date_fin_prevue)}`
          : "CDI"
        : "—",
    ],
    ["Durée de travail", formatDuree(g)],
    ["Salaire", formatSalaireHoraire(g.salaire_horaire_net)],
  ];
  return (
    <div className="text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {lignes.map(([dt, dd]) => (
          <div key={dt}>
            <dt className="text-foreground/60">{dt}</dt>
            <dd className="font-medium">{dd}</dd>
          </div>
        ))}
      </dl>
      {(() => {
        // Champs complémentaires du contrat (brique 3f), par rubrique.
        const valeurs: Record<string, string> = {
          ...(g.config ?? {}),
          civilite_salarie: g.civilite_salarie ?? "",
          adresse_salarie: g.adresse_salarie ?? "",
          code_postal_salarie: g.code_postal_salarie ?? "",
          ville_salarie: g.ville_salarie ?? "",
        };
        const ctx: ContexteChamps = {
          type_gestion: g.type_gestion,
          categorie: (categorie(valeurs.categorie) ?? categorieDeLaGestion(g.type_gestion, valeurs.garde_partagee)).cle,
          type_contrat: g.type_contrat ?? "",
          remplacement: Boolean(g.remplace_gestion_id),
        };
        const blocs = ETAPES.map((e) => ({
          titre: e.titre,
          lignes: CHAMPS.filter((c) => c.etape === e.cle)
            .filter((c) => champVisible(c, valeurs, ctx) && (valeurs[c.cle] ?? "").trim())
            .map((c) => [c.libelle.replace(/ \?$/, ""), valeurLisible(c, valeurs[c.cle], ctx, formatDate)] as [string, string]),
        })).filter((b) => b.lignes.length);
        if (!blocs.length) return null;
        return (
          <div className="mt-4 flex flex-col gap-3">
            {blocs.map((b) => (
              <div key={b.titre}>
                <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">{b.titre}</p>
                <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                  {b.lignes.map(([dt, dd]) => (
                    <div key={dt}>
                      <dt className="inline text-foreground/60">{dt} : </dt>
                      <dd className="inline whitespace-pre-line font-medium">{dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        );
      })()}
      {g.precisions ? (
        <p className="mt-3 whitespace-pre-line text-foreground/80">
          <span className="text-foreground/60">Précisions : </span>
          {g.precisions}
        </p>
      ) : null}
    </div>
  );
}
