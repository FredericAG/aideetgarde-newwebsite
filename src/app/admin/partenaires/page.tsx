import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PARTENAIRES, PROVENANCES, type ClePartenaire } from "@/lib/partenaires";
import { EmailCopiable } from "@/components/EmailCopiable";

export const metadata: Metadata = { title: "Partenaires — Administration Aide & Garde" };

interface LigneMois {
  partenaire: ClePartenaire;
  mois: string;
  depuis: string;
  clics: number;
  abonnes: number;
  visiteurs_non_connectes: number;
}
interface Ligne12 {
  partenaire: ClePartenaire;
  clics: number;
  abonnes: number;
  visiteurs_non_connectes: number;
}

const ORDRE: ClePartenaire[] = ["asc", "ircem", "spstn", "spstn_salarie", "fiche"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const libelleMois = (iso: string) => `${MOIS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/**
 * Bilan des visites envoyées aux partenaires (brique 10) : de quoi montrer à
 * l'ASC, à l'Ircem et au SPSTN combien de personnes Aide & Garde leur
 * apporte. Seuls des totaux : aucune donnée personnelle n'est transmise.
 */
export default async function PartenairesPage() {
  const { supabase } = await requireAdmin("/admin/partenaires");
  const depuis12 = new Date();
  depuis12.setMonth(depuis12.getMonth() - 11, 1);
  const [moisRes, totRes, resumeRes, parMoisRes] = await Promise.all([
    supabase
      .from("admin_clics_partenaires")
      .select("*")
      .gte("mois", depuis12.toISOString().slice(0, 10))
      .limit(1000),
    supabase.from("admin_clics_partenaires_12mois").select("*"),
    // Bases des pourcentages : abonnés actifs et salariés suivis aujourd'hui.
    supabase.from("admin_abonnements_resume").select("nb_actifs, places_utilisees").maybeSingle(),
    supabase
      .from("admin_clics_partenaires_mois")
      .select("partenaire, mois, clics, abonnes")
      .gte("mois", depuis12.toISOString().slice(0, 10)),
  ]);
  const parMois = (parMoisRes.data ?? []) as { partenaire: ClePartenaire; mois: string; clics: number; abonnes: number }[];
  const nbAbonnes = Number(resumeRes.data?.nb_actifs ?? 0);
  const nbSalaries = Number(resumeRes.data?.places_utilisees ?? 0);
  /** Pourcentage arrondi, « — » si la base est nulle. */
  const pct = (n: number, base: number) => (base > 0 ? `${Math.round((n / base) * 100)} %` : "—");
  const lignes = (moisRes.data ?? []) as LigneMois[];
  const totaux = new Map(((totRes.data ?? []) as Ligne12[]).map((t) => [t.partenaire, t]));
  const mois = [...new Set(lignes.map((l) => l.mois))].sort().reverse();
  const somme = (p: ClePartenaire, m?: string, d?: string) =>
    lignes
      .filter((l) => l.partenaire === p && (!m || l.mois === m) && (!d || l.depuis === d))
      .reduce((n, l) => n + l.clics, 0);
  const provenances = Object.keys(PROVENANCES).filter((d) => lignes.some((l) => l.depuis === d));
  const fiches = totaux.get("fiche")?.clics ?? 0;

  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-5xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Partenaires : visites envoyées</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Chaque clic sur un lien vers l&apos;ASC loisirs, l&apos;Ircem ou le SPSTN (centre d&apos;aide, page d&apos;une
          gestion, fiche remise au salarié, QR codes) est compté avant d&apos;ouvrir le site du partenaire. Vos propres
          clics d&apos;administrateur ne sont pas comptés.
        </p>

        {(moisRes.error || totRes.error) && (
          <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Statistiques indisponibles : exécutez le script <code>supabase/brique10_clics_partenaires.sql</code>.
          </p>
        )}

        <section className="mt-8">
          <h2 className="font-bold text-brand-teal">12 derniers mois</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Bases des pourcentages : <strong>{nbAbonnes}</strong> abonnés actifs et <strong>{nbSalaries}</strong>{" "}
            salariés suivis aujourd&apos;hui.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-brand-gray/25">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead className="entete-liste">
                <tr>
                  <th className="px-3 py-2">Destination</th>
                  <th className="px-3 py-2 text-right">Visites envoyées</th>
                  <th className="px-3 py-2 text-right">Abonnés distincts</th>
                  <th className="px-3 py-2 text-right" title="Abonnés distincts rapportés aux abonnés actifs ; pour la fiche : fiches rapportées aux salariés suivis">
                    Part des abonnés
                  </th>
                  <th className="px-3 py-2 text-right">Visiteurs non connectés</th>
                  <th className="px-3 py-2">Phrase pour le partenaire</th>
                </tr>
              </thead>
              <tbody>
                {ORDRE.map((p) => {
                  const t = totaux.get(p);
                  const part =
                    p === "fiche" ? pct(t?.clics ?? 0, nbSalaries) : pct(t?.abonnes ?? 0, nbAbonnes);
                  const phrase =
                    p === "fiche"
                      ? `Sur les 12 derniers mois, ${t?.clics ?? 0} fiches « Vos droits et avantages » ont été téléchargées par des particuliers employeurs pour être remises à leurs salariés, soit l'équivalent de ${part} des ${nbSalaries} salariés que nous suivons.`
                      : `Sur les 12 derniers mois, Aide & Garde a orienté ${t?.clics ?? 0} visites vers ${PARTENAIRES[p].nom}, dont ${t?.abonnes ?? 0} particuliers employeurs abonnés distincts, soit ${part} de nos ${nbAbonnes} abonnés${fiches ? ` ; ${fiches} fiches d'information ont aussi été remises aux salariés` : ""}.`;
                  return (
                    <tr key={p} className="border-t border-brand-gray/20 align-top">
                      <td className="px-3 py-2 font-medium">{PARTENAIRES[p].nom}</td>
                      <td className="px-3 py-2 text-right font-bold">{t?.clics ?? 0}</td>
                      <td className="px-3 py-2 text-right">{t?.abonnes ?? 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-brand-violet">{part}</td>
                      <td className="px-3 py-2 text-right">{t?.visiteurs_non_connectes ?? 0}</td>
                      <td className="px-3 py-2 text-xs text-foreground/75">
                        <EmailCopiable email={phrase} phrase />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            « Visiteurs non connectés » : surtout les salariés qui scannent un QR code de la fiche, ou un clic depuis le
            centre d&apos;aide sans être connecté. Un même abonné qui clique plusieurs fois compte une seule fois dans «
            Abonnés distincts ». « Part des abonnés » : abonnés distincts rapportés aux abonnés actifs ; pour la
            fiche, fiches téléchargées rapportées aux salariés suivis (une fiche peut être téléchargée plusieurs fois
            pour un même salarié : c&apos;est un ordre de grandeur).
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-bold text-brand-teal">Par mois</h2>
          <p className="mt-1 text-xs text-foreground/60">Visites du mois et, entre parenthèses, la part des abonnés (des salariés suivis pour les fiches).</p>
          {mois.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">Aucune visite enregistrée pour l&apos;instant.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-brand-gray/25">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead className="entete-liste">
                  <tr>
                    <th className="px-3 py-2">Mois</th>
                    {ORDRE.map((p) => (
                      <th key={p} className="px-3 py-2 text-right">
                        {p === "fiche" ? "Fiches" : PARTENAIRES[p].nom.split(" (")[0].split(" emploi")[0]}
                        {p === "spstn_salarie" ? " (salariés)" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mois.map((m) => (
                    <tr key={m} className="border-t border-brand-gray/20">
                      <td className="px-3 py-2">{libelleMois(m)}</td>
                      {ORDRE.map((p) => {
                        const n = somme(p, m);
                        const ab = parMois.find((x) => x.partenaire === p && x.mois === m)?.abonnes ?? 0;
                        return (
                          <td key={p} className="px-3 py-2 text-right">
                            {n ? (
                              <>
                                {n}
                                <span className="ml-1 text-xs text-foreground/60">
                                  ({p === "fiche" ? pct(n, nbSalaries) : pct(ab, nbAbonnes)})
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {provenances.length > 0 && (
          <section className="mt-10">
            <h2 className="font-bold text-brand-teal">D&apos;où viennent les clics (12 mois)</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-brand-gray/25">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead className="entete-liste">
                  <tr>
                    <th className="px-3 py-2">Provenance</th>
                    {ORDRE.map((p) => (
                      <th key={p} className="px-3 py-2 text-right">
                        {p === "fiche" ? "Fiches" : p === "spstn_salarie" ? "SPSTN (salariés)" : PARTENAIRES[p].nom.split(" (")[0].split(" emploi")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {provenances.map((d) => (
                    <tr key={d} className="border-t border-brand-gray/20">
                      <td className="px-3 py-2">{PROVENANCES[d]}</td>
                      {ORDRE.map((p) => (
                        <td key={p} className="px-3 py-2 text-right">
                          {somme(p, undefined, d) || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="mt-8 text-xs text-foreground/60">
          Données : date, destination, provenance et, pour un abonné connecté, son compte (pour ne le compter qu&apos;une
          fois) ; ni adresse IP ni cookie. Après 13 mois, le lien avec le compte est effacé.{" "}
          <Link href="/confidentialite#donnees" className="underline">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </div>
  );
}
