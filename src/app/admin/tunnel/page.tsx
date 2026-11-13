import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { libelleMois } from "@/lib/data";
import { decalerPeriode, periodeValide } from "@/lib/paie-du-mois";
import { LIBELLES_ORIGINE } from "@/lib/origine";
import { lireTunnel } from "@/lib/tunnel";

export const metadata = { title: "Tunnel — Administration Aide & Garde" };

function moisCourant(): string {
  const d = new Date();
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
const maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * « Tunnel » (mesure du tunnel, audit T1, 13/11/2026) : d'où viennent les
 * visiteurs, combien créent un compte, souscrivent, envoient une gestion.
 * Sert à juger le test Google Ads du Cadre (coût d'acquisition cible 40 €).
 */
export default async function TunnelPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { supabase } = await requireAdmin("/admin/tunnel");
  const { mois } = await searchParams;
  const courant = moisCourant();
  const periode = periodeValide(mois) ? mois : courant;
  const t = await lireTunnel(supabase, periode);
  const lien = (m: string) => `/admin/tunnel?mois=${m}`;

  const etapes = [
    { libelle: "Visites (arrivées sur le site)", nb: t.arrivees, note: "sans cookie ; la navigation interne n'est pas recomptée" },
    { libelle: "Comptes créés", nb: t.comptes, note: `${pct(t.comptes, t.arrivees)} des visites` },
    { libelle: "… dont abonnés", nb: t.abonnes, note: `${pct(t.abonnes, t.comptes)} des comptes du mois` },
    { libelle: "… dont gestion envoyée", nb: t.avecGestion, note: `${pct(t.avecGestion, t.comptes)} des comptes du mois` },
  ];
  const max = Math.max(1, ...etapes.map((e) => e.nb));

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-5xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Tunnel d&apos;acquisition</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={lien(decalerPeriode(periode, -1))} className="btn btn-secondaire btn-sm" aria-label="Mois précédent">
            ‹ {maj(libelleMois(decalerPeriode(periode, -1)))}
          </Link>
          <span className="rounded-full bg-brand-violet px-4 py-1.5 text-sm font-bold text-white">{maj(libelleMois(periode))}</span>
          {periode !== courant && (
            <Link href={lien(decalerPeriode(periode, 1))} className="btn btn-secondaire btn-sm" aria-label="Mois suivant">
              {maj(libelleMois(decalerPeriode(periode, 1)))} ›
            </Link>
          )}
        </div>

        {!t.installe && (
          <p className="mt-6 rounded-lg border border-brand-jaune bg-brand-jaune/20 p-3 text-sm">
            Exécutez le script supabase/brique12_mesure_tunnel.sql pour activer la mesure.
          </p>
        )}

        <section className="carte mt-6 p-4 sm:p-5" aria-labelledby="titre-entonnoir">
          <h2 id="titre-entonnoir" className="font-bold text-brand-teal">
            Entonnoir du mois
          </h2>
          <ol className="mt-4 flex flex-col gap-3">
            {etapes.map((e, i) => (
              <li key={e.libelle} className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                <span className="text-sm font-medium">{e.libelle}</span>
                <span className="flex items-center gap-3">
                  <span className="h-7 min-w-[2px] rounded-md bg-brand-violet" style={{ width: `${Math.max(0.5, (e.nb / max) * 100)}%`, opacity: 1 - i * 0.15 }} />
                  <span className="whitespace-nowrap text-sm">
                    <strong className="tabular-nums">{e.nb}</strong>{" "}
                    <span className="text-foreground/60">{e.note}</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-foreground/60">
            Les comptes sont ceux créés dans le mois ; « abonnés » et « gestion envoyée » sont comptés à ce jour, quel que
            soit le mois de la souscription. Tous comptes confondus, ce mois-ci : {t.souscriptionsDuMois} abonnement(s)
            démarré(s) et {t.gestionsEnvoyeesDuMois} gestion(s) envoyée(s). {t.pagesVues} pages vues au total.
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="carte p-4 sm:p-5" aria-labelledby="titre-origines">
            <h2 id="titre-origines" className="font-bold text-brand-teal">
              D&apos;où viennent les visites
            </h2>
            <Tableau
              colonnes={["Origine", "Visites", "Part"]}
              lignes={t.parOrigine.map((o) => [LIBELLES_ORIGINE[o.origine] ?? o.origine, String(o.nb), pct(o.nb, t.arrivees)])}
              vide="Aucune visite comptée ce mois-ci."
            />
          </section>
          <section className="carte p-4 sm:p-5" aria-labelledby="titre-pages">
            <h2 id="titre-pages" className="font-bold text-brand-teal">
              Pages d&apos;arrivée
            </h2>
            <Tableau
              colonnes={["Page", "Visites"]}
              lignes={t.pagesArrivee.map((p) => [p.page, String(p.nb)])}
              vide="Aucune visite comptée ce mois-ci."
            />
          </section>
        </div>

        <section className="carte mt-6 p-4 sm:p-5" aria-labelledby="titre-declare">
          <h2 id="titre-declare" className="font-bold text-brand-teal">
            Comptes du mois par origine déclarée
          </h2>
          <p className="mt-1 text-xs text-foreground/60">Réponse à « Comment nous avez-vous connus ? » (facultative) à l&apos;inscription.</p>
          <Tableau
            colonnes={["Origine déclarée", "Comptes", "Abonnés", "Gestion envoyée"]}
            lignes={t.parOrigineDeclaree.map((o) => [
              o.libelle,
              String(o.comptes),
              `${o.abonnes} (${pct(o.abonnes, o.comptes)})`,
              `${o.avecGestion} (${pct(o.avecGestion, o.comptes)})`,
            ])}
            vide="Aucun compte créé ce mois-ci."
          />
        </section>

        <p className="mt-6 text-xs text-foreground/60">
          Coût d&apos;acquisition d&apos;une campagne : dépense du mois ÷ abonnés venus de cette campagne (origine
          déclarée « publicité »). Cible du Cadre stratégique : 40 € par client.
        </p>
      </div>
    </div>
  );
}

function Tableau({ colonnes, lignes, vide }: { colonnes: string[]; lignes: string[][]; vide: string }) {
  if (!lignes.length) return <p className="mt-3 text-sm text-foreground/60">{vide}</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-gray/25 text-left text-xs text-foreground/60">
            {colonnes.map((c, i) => (
              <th key={c} className={`py-1.5 pr-3 font-medium ${i ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l[0]} className="border-b border-brand-gray/10">
              {l.map((c, i) => (
                <td key={i} className={`py-1.5 pr-3 ${i ? "whitespace-nowrap text-right tabular-nums" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
