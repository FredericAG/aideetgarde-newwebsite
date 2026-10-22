import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { THEMES, themeParSlug } from "@/lib/aide/contenu";
import { EN_RELECTURE, MIS_A_JOUR, type Bloc } from "@/lib/aide/types";
import { BlocContact } from "../BlocContact";
import { OuvrirAncre } from "./OuvrirAncre";

export function generateStaticParams() {
  return THEMES.map((t) => ({ theme: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const t = themeParSlug((await params).theme);
  if (!t) return {};
  return {
    title: `${t.titre} — Centre d'aide Aide & Garde`,
    description: t.intro,
    ...(EN_RELECTURE ? { robots: { index: false, follow: false } } : {}),
  };
}

function Contenu({ bloc }: { bloc: Bloc }) {
  if ("p" in bloc) return <p>{bloc.p}</p>;
  if ("liste" in bloc) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {bloc.liste.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    );
  }
  if ("etapes" in bloc) {
    return (
      <ol className="space-y-3">
        {bloc.etapes.map((e, i) => (
          <li key={e.titre} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-violet text-xs font-bold text-white"
            >
              {i + 1}
            </span>
            <span>
              <span className="block font-bold text-brand-black">{e.titre}</span>
              {e.texte}
            </span>
          </li>
        ))}
      </ol>
    );
  }
  if ("tableau" in bloc) {
    return (
      <div className="overflow-x-auto rounded-lg border border-brand-gray/25">
        <table className="w-full border-collapse text-left text-sm">
          {bloc.tableau.legende && <caption className="sr-only">{bloc.tableau.legende}</caption>}
          <thead className="entete-teal">
            <tr>
              {bloc.tableau.entetes.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 align-bottom">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloc.tableau.lignes.map((l) => (
              <tr key={l[0]} className="border-t border-brand-gray/20 even:bg-[#f7f7f7]">
                {l.map((c, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-2 align-top font-bold text-brand-black">
                      {c}
                    </th>
                  ) : (
                    <td key={i} className="px-3 py-2 align-top">
                      {c}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if ("exemple" in bloc) {
    return (
      <p className="rounded-lg border-l-4 border-brand-teal bg-brand-sky-tint/30 px-3 py-2">
        <strong className="text-brand-teal">Exemple : </strong>
        {bloc.exemple}
      </p>
    );
  }
  return <p className="rounded-lg bg-brand-jaune/25 px-3 py-2">{bloc.note}</p>;
}

/**
 * Page d'un thème du centre d'aide : une question par bloc dépliable, avec
 * sa réponse courte visible dès l'ouverture puis le détail. Chaque question
 * a son adresse (#ancre), ouverte automatiquement depuis la recherche ou un
 * lien d'aide contextuelle.
 */
export default async function ThemeAidePage({ params }: { params: Promise<{ theme: string }> }) {
  const theme = themeParSlug((await params).theme);
  if (!theme) notFound();

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl">
        <nav aria-label="Fil d'Ariane" className="text-sm">
          <Link href="/aide" className="text-brand-teal underline">
            Centre d&apos;aide
          </Link>
          <span aria-hidden="true" className="mx-1.5 text-foreground/40">
            ›
          </span>
          <span className="text-foreground/70">{theme.titre}</span>
        </nav>
        <h1 className="mt-3 font-display font-black text-2xl text-brand-teal">{theme.titre}</h1>
        <p className="mt-1 text-sm text-foreground/70">{theme.intro}</p>

        {EN_RELECTURE && (
          <p className="mt-4 rounded-lg border border-brand-jaune bg-brand-jaune/20 px-3 py-2 text-xs">
            Pages en cours de relecture par Aide &amp; Garde. En cas de doute sur votre situation,
            contactez-nous.
          </p>
        )}

        <OuvrirAncre />
        <div className="mt-6 flex flex-col gap-3">
          {theme.questions.map((q) => (
            <details
              key={q.slug}
              id={q.slug}
              className="carte group scroll-mt-4 overflow-hidden open:ring-2 open:ring-brand-violet/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold text-brand-teal">
                <span>{q.question}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-lg leading-none text-brand-violet transition-transform group-open:rotate-90"
                >
                  ›
                </span>
              </summary>
              <div className="space-y-3 border-t border-brand-gray/15 bg-white px-4 py-4 text-sm leading-relaxed text-foreground/90">
                <p className="font-medium text-brand-black">{q.resume}</p>
                {q.corps?.map((b, i) => (
                  <Contenu key={i} bloc={b} />
                ))}
                {q.source && <p className="text-xs text-foreground/60">Référence : {q.source}.</p>}
                {q.lien && (
                  <p>
                    <Link href={q.lien.href} className="font-medium text-brand-teal underline">
                      {q.lien.libelle} ›
                    </Link>
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>

        <p className="mt-6 text-xs text-foreground/50">
          Mis à jour le {MIS_A_JOUR}. Ces informations sont générales : elles ne remplacent pas un
          conseil adapté à votre situation. Texte de référence : la{" "}
          <a
            href="https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            convention collective des particuliers employeurs et de l&apos;emploi à domicile (IDCC 3239)
          </a>
          .
        </p>

        <BlocContact />
      </div>
    </div>
  );
}
