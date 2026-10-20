import {
  TYPES_GESTION,
  formatDate,
  formatDuree,
  formatSalaireHoraire,
  nomSalarie,
  type Gestion,
} from "@/lib/data";

/** Récapitulatif des informations du contrat d'une gestion (lecture seule). */
export function RecapGestion({ gestion: g }: { gestion: Gestion }) {
  const lignes: [string, string][] = [
    ["Salarié", nomSalarie(g)],
    ["Emploi", TYPES_GESTION[g.type_gestion]],
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
      {g.precisions ? (
        <p className="mt-3 whitespace-pre-line text-foreground/80">
          <span className="text-foreground/60">Précisions : </span>
          {g.precisions}
        </p>
      ) : null}
    </div>
  );
}
