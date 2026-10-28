"use client";

import { JOURS_SEMAINE, dureeEntre, lirePlanning, type HorairesJour } from "@/lib/contrat/champs";

/** 8.5 → « 8,5 » ; 8 → « 8 ». */
export function heuresEnTexte(n: number): string {
  return (Math.round(n * 100) / 100).toString().replace(".", ",");
}

function nombre(t: string): number {
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Totaux de la semaine : présence réelle, travail effectif, présence responsable. */
export function totauxPlanning(valeur: string | undefined): { reelle: number; effectif: number; responsable: number } {
  let reelle = 0;
  let effectif = 0;
  let responsable = 0;
  for (const h of Object.values(lirePlanning(valeur))) {
    const duree = dureeEntre(h.a, h.d) ?? 0;
    const r = nombre(h.r);
    reelle += duree;
    responsable += r;
    effectif += h.e ? nombre(h.e) : Math.max(0, duree - r);
  }
  return { reelle, effectif, responsable };
}

const caseHeure =
  "w-full min-w-0 rounded-md border border-brand-gray/40 bg-white px-1.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand-teal";

/**
 * Horaires détaillés par jour (retour du 27/10, d'après le tableau du
 * contrat Aide & Garde) : arrivée, départ, durée de présence calculée,
 * dont travail effectif et présence responsable. Colonnes = jours cochés
 * dans « Jours de travail » (tous les jours si aucun). Sur téléphone, un
 * bloc par jour.
 */
export function PlanningJours({
  valeur,
  onChange,
  jours,
  presenceResponsable,
}: {
  valeur: string;
  onChange: (v: string) => void;
  /** Jours cochés, séparés par « | ». */
  jours: string;
  presenceResponsable: boolean;
}) {
  const planning = lirePlanning(valeur);
  const coches = new Set(jours.split("|").filter(Boolean));
  const colonnes = JOURS_SEMAINE.filter((j) => coches.size === 0 || coches.has(j.valeur));
  const maj = (jour: string, cle: keyof HorairesJour, v: string) => {
    const actuel = planning[jour] ?? { a: "", d: "", e: "", r: "" };
    onChange(JSON.stringify({ ...planning, [jour]: { ...actuel, [cle]: v } }));
  };
  const duree = (jour: string) => {
    const h = planning[jour];
    const d = h ? dureeEntre(h.a, h.d) : null;
    return d == null ? "" : `${heuresEnTexte(d)} h`;
  };
  const effectifPropose = (jour: string) => {
    const h = planning[jour];
    const d = h ? dureeEntre(h.a, h.d) : null;
    if (d == null) return "";
    return heuresEnTexte(Math.max(0, d - nombre(h?.r ?? "")));
  };
  const t = totauxPlanning(valeur);
  const saisieDuree = (jour: string, cle: "e" | "r", libelle: string) => (
    <input
      inputMode="decimal"
      value={planning[jour]?.[cle] ?? ""}
      placeholder={cle === "e" ? effectifPropose(jour) : ""}
      aria-label={`${libelle}, ${jour}`}
      onChange={(e) => maj(jour, cle, e.target.value.replace(/[^\d,.]/g, ""))}
      className={caseHeure}
    />
  );
  const lignes: { libelle: string; cellule: (jour: string) => React.ReactNode }[] = [
    {
      libelle: "Heure d'arrivée",
      cellule: (j) => (
        <input type="time" value={planning[j]?.a ?? ""} aria-label={`Heure d'arrivée, ${j}`} onChange={(e) => maj(j, "a", e.target.value)} className={caseHeure} />
      ),
    },
    {
      libelle: "Heure de départ",
      cellule: (j) => (
        <input type="time" value={planning[j]?.d ?? ""} aria-label={`Heure de départ, ${j}`} onChange={(e) => maj(j, "d", e.target.value)} className={caseHeure} />
      ),
    },
    { libelle: "Durée de présence", cellule: (j) => <span className="block py-1.5 tabular-nums text-foreground/70 sm:text-center">{duree(j) || "—"}</span> },
    { libelle: "Dont travail effectif (h)", cellule: (j) => saisieDuree(j, "e", "Travail effectif") },
    ...(presenceResponsable
      ? [{ libelle: "Et présence responsable (h)", cellule: (j: string) => saisieDuree(j, "r", "Présence responsable") }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-2 font-normal text-foreground">
      {/* Ordinateur : jours en colonnes, comme le tableau du contrat. */}
      <div className="hidden overflow-x-auto rounded-lg border border-brand-gray/25 bg-white sm:block">
        <table className="w-full border-collapse text-sm">
          <thead className="entete-teal">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-bold">Jour</th>
              {colonnes.map((j) => (
                <th key={j.valeur} className="px-1 py-2 text-center text-xs font-bold">
                  {j.libelle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.libelle} className="border-t border-brand-gray/15 even:bg-[#f7f7f7]">
                <th scope="row" className="px-2 py-1.5 text-left text-xs font-medium text-foreground/80">
                  {l.libelle}
                </th>
                {colonnes.map((j) => (
                  <td key={j.valeur} className="min-w-[4.75rem] px-1 py-1">
                    {l.cellule(j.valeur)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Téléphone : un bloc par jour. */}
      <div className="flex flex-col gap-2 sm:hidden">
        {colonnes.map((j) => (
          <div key={j.valeur} className="rounded-lg border border-brand-gray/25 bg-white p-3">
            <p className="text-sm font-bold text-brand-teal">{j.libelle}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              {lignes.map((l) => (
                <div key={l.libelle} className="flex flex-col gap-1 text-xs text-foreground/70">
                  {l.libelle}
                  {l.cellule(j.valeur)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {t.reelle > 0 && (
        <p className="text-sm">
          Semaine : <strong>{heuresEnTexte(t.reelle)} h</strong> de présence, dont{" "}
          <strong>{heuresEnTexte(t.effectif)} h</strong> de travail effectif
          {presenceResponsable && t.responsable > 0 ? (
            <>
              {" "}
              et <strong>{heuresEnTexte(t.responsable)} h</strong> de présence responsable
            </>
          ) : null}
          .
        </p>
      )}
    </div>
  );
}
