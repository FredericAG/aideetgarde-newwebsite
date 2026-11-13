"use client";

import { useMemo, useState } from "react";
import { CONFIG_SIMULATEUR, simuler, type ResultatSimulateur } from "@/lib/simulateur";

const champ =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal sm:text-sm";
const etiquette = "flex flex-col gap-1 text-sm font-medium";
const aide = "text-xs font-normal text-foreground/60";

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const heures = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function lire(v: string): number {
  return parseFloat(v.replace(",", ".").replace(/\s/g, ""));
}

/** Lignes du détail : libellés de l'onglet « Simulateur » de l'Excel. */
const DETAIL: ([string] | [keyof ResultatSimulateur, string, "eur" | "h", boolean?])[] = [
  ["Le contrat"],
  ["H3", "Salaire horaire net", "eur"],
  ["H4", "Salaire horaire brut", "eur"],
  ["H6", "Heures par mois", "h"],
  ["H7", "Salaire net mensuel (perçu par le salarié)", "eur"],
  ["Les cotisations"],
  ["H9", "Charges salariales", "eur"],
  ["H10", "Salaire brut mensuel", "eur"],
  ["H11", "Charges patronales", "eur"],
  ["H12", "Coût total employeur, sans aucune aide", "eur", true],
  ["Les aides"],
  ["H14", "Déduction forfaitaire (moyenne)", "eur"],
  ["H15", "Aide CAF sur le salaire net (CMG)", "eur"],
  ["H16", "Aide sur les cotisations", "eur"],
  ["H17", "Reste à payer sur les cotisations", "eur"],
  ["H18", "Coût par mois après aides", "eur", true],
  ["Transport et indemnités"],
  ["H20", "Indemnité repas moyenne par mois", "eur"],
  ["H21", "Participation au transport par mois", "eur"],
  ["Sur un an"],
  ["H23", "Salaire net moins aides", "eur"],
  ["H24", "Cotisations moins aides", "eur"],
  ["H26", "Indemnités", "eur"],
  ["H27", "Total", "eur"],
  ["H28", "Plafond de dépenses du crédit d'impôt", "eur"],
  ["H29", "Coût final, après crédit d'impôt de 50 %", "eur", true],
];

export function Simulateur() {
  const [v, setV] = useState({
    net: "10,08",
    heures: "40",
    enfants: "1",
    ageAns: "1",
    ageMois: "0",
    revenu: "60000",
    niveau: String(CONFIG_SIMULATEUR.niveauDefaut),
    transport: "50",
    repas: "0",
    jours: "5",
  });
  const maj = (cle: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((x) => ({ ...x, [cle]: e.target.value }));

  const r = useMemo(
    () =>
      simuler({
        netHoraire: lire(v.net),
        heuresHebdo: lire(v.heures),
        enfants: lire(v.enfants),
        ageAns: lire(v.ageAns),
        ageMois: lire(v.ageMois),
        revenu: lire(v.revenu),
        niveau: Number(v.niveau),
        transportPct: lire(v.transport),
        repasJour: lire(v.repas),
        joursSemaine: lire(v.jours),
      }),
    [v],
  );

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form className="carte flex flex-col gap-4 p-4 sm:p-5" onSubmit={(e) => e.preventDefault()}>
        <h2 className="font-bold text-brand-teal">Votre situation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={etiquette}>
            Salaire horaire net (€)
            <span className={aide}>Ce que perçoit le salarié par heure</span>
            <input id="sim-net" inputMode="decimal" value={v.net} onChange={maj("net")} className={champ} />
          </label>
          <label className={etiquette}>
            Heures par semaine
            <span className={aide}>Majorées au-delà de 40 h</span>
            <input id="sim-heures" inputMode="decimal" value={v.heures} onChange={maj("heures")} className={champ} />
          </label>
          <label className={etiquette}>
            Enfants à charge
            <select id="sim-enfants" value={v.enfants} onChange={maj("enfants")} className={champ}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4 ou plus</option>
            </select>
          </label>
          <fieldset className="flex flex-col gap-1 text-sm font-medium">
            <legend>Âge du plus jeune enfant gardé</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className={etiquette}>
                <span className={aide}>ans</span>
                <input id="sim-age-ans" inputMode="numeric" value={v.ageAns} onChange={maj("ageAns")} className={champ} />
              </label>
              <label className={etiquette}>
                <span className={aide}>mois</span>
                <input id="sim-age-mois" inputMode="numeric" value={v.ageMois} onChange={maj("ageMois")} className={champ} />
              </label>
            </div>
          </fieldset>
          <label className={`${etiquette} sm:col-span-2`}>
            Revenu fiscal de référence du foyer (€ par an)
            <span className={aide}>Sur votre dernier avis d&apos;impôt</span>
            <input id="sim-revenu" inputMode="decimal" value={v.revenu} onChange={maj("revenu")} className={`${champ} sm:max-w-xs`} />
          </label>
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-bold text-brand-teal">Options avancées</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className={etiquette}>
              Niveau du salarié
              <select id="sim-niveau" value={v.niveau} onChange={maj("niveau")} className={champ}>
                {Object.entries(CONFIG_SIMULATEUR.grille).map(([n, g]) => (
                  <option key={n} value={n}>
                    Niveau {n} : minimum {g.shn.toFixed(2).replace(".", ",")} € net/h
                  </option>
                ))}
              </select>
            </label>
            <label className={etiquette}>
              Transport pris en charge (%)
              <span className={aide}>50 % : remboursement légal</span>
              <input id="sim-transport" inputMode="decimal" value={v.transport} onChange={maj("transport")} className={champ} />
            </label>
            <label className={etiquette}>
              Indemnité repas (€ par jour)
              <input id="sim-repas" inputMode="decimal" value={v.repas} onChange={maj("repas")} className={champ} />
            </label>
            <label className={etiquette}>
              Jours travaillés par semaine
              <input id="sim-jours" inputMode="numeric" value={v.jours} onChange={maj("jours")} className={champ} />
            </label>
          </div>
        </details>
      </form>

      <section aria-live="polite" aria-label="Résultat de la simulation" className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <Chiffre titre="Par mois, après aides" valeur={euros.format(r.H18)} principal />
          <Chiffre titre="Sur un an, après crédit d'impôt" valeur={euros.format(r.H29)} />
          <Chiffre titre="Soit par heure" valeur={euros.format(r.H30)} />
        </div>
        <p className="text-sm text-foreground/75">
          Sans aucune aide, le même emploi coûte {euros.format(r.H12)} par mois. Le crédit d&apos;impôt de 50 % est
          versé l&apos;année suivante.
        </p>
        {r.messages.length > 0 && (
          <ul className="flex flex-col gap-2">
            {r.messages.map((m) => (
              <li key={m} className="rounded-md border-l-4 border-brand-jaune bg-brand-jaune/20 px-3 py-2 text-sm">
                {m}
              </li>
            ))}
          </ul>
        )}
        <details className="carte p-4">
          <summary className="cursor-pointer text-sm font-bold text-brand-teal">Voir le détail du calcul</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {DETAIL.map((l) =>
                  l.length === 1 ? (
                    <tr key={l[0]}>
                      <th colSpan={2} className="bg-brand-teal px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                        {l[0]}
                      </th>
                    </tr>
                  ) : (
                    <tr key={l[0]} className={l[3] ? "bg-brand-sky-tint/60 font-bold" : "border-b border-brand-gray/15"}>
                      <th scope="row" className="px-3 py-1.5 text-left font-normal">
                        {l[1]}
                      </th>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                        {l[2] === "h" ? `${heures.format(r[l[0]] as number)} h` : euros.format(r[l[0]] as number)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}

function Chiffre({ titre, valeur, principal }: { titre: string; valeur: string; principal?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${principal ? "bg-brand-violet text-white" : "carte"}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${principal ? "text-white/85" : "text-brand-violet"}`}>{titre}</p>
      <p className="mt-1 font-display text-2xl font-black tabular-nums">{valeur}</p>
    </div>
  );
}
