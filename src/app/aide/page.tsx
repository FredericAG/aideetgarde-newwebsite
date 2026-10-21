import Link from "next/link";
import type { Metadata } from "next";
import { THEMES, indexRecherche } from "@/lib/aide/contenu";
import { EN_RELECTURE, PORTES } from "@/lib/aide/types";
import { RechercheAide } from "./RechercheAide";
import { BlocContact } from "./BlocContact";

export const metadata: Metadata = {
  title: "Centre d'aide — Aide & Garde",
  description:
    "Bulletin de paie, contrat, aides de la CAF, congés, arrêt de travail, fin du contrat : les réponses d'Aide & Garde aux questions des particuliers employeurs.",
  ...(EN_RELECTURE ? { robots: { index: false, follow: false } } : {}),
};

/**
 * Centre d'aide (onglet « Aide », spécifications § 6 bis) : recherche, puis
 * trois portes d'entrée (comprendre mes documents, employer un salarié,
 * utiliser mon espace), les outils et le contact. Page publique.
 */
export default function AidePage() {
  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Centre d&apos;aide</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Les réponses aux questions des particuliers employeurs, et l&apos;aide sur votre espace.
        </p>

        <div className="mt-6">
          <RechercheAide index={indexRecherche()} />
        </div>

        {PORTES.map((porte) => {
          const themes = THEMES.filter((t) => t.porte === porte.cle);
          return (
            <section key={porte.cle} className="mt-10" aria-labelledby={`porte-${porte.cle}`}>
              <h2 id={`porte-${porte.cle}`} className="font-bold text-brand-violet">
                {porte.titre}
              </h2>
              <p className="mt-0.5 text-sm text-foreground/70">{porte.texte}</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {themes.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/aide/${t.slug}`}
                      className="carte group flex h-full flex-col p-4 transition-shadow hover:shadow-md"
                    >
                      <span className="flex items-center justify-between gap-2 font-bold text-brand-teal">
                        <span className="group-hover:underline">{t.titre}</span>
                        <span aria-hidden="true" className="text-foreground/40">›</span>
                      </span>
                      <span className="mt-1 text-xs text-foreground/60">
                        {t.questions.length} question{t.questions.length > 1 ? "s" : ""} ·{" "}
                        {t.questions
                          .slice(0, 2)
                          .map((q) => q.question.replace(/ \?$/, ""))
                          .join(" · ")}
                        {t.questions.length > 2 ? "…" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="mt-10" aria-labelledby="titre-outils">
          <h2 id="titre-outils" className="font-bold text-brand-violet">
            Outils
          </h2>
          <div className="carte mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold text-brand-teal">Simulateur de coût de la garde à domicile</p>
              <p className="text-xs text-foreground/60">
                Coût mensuel et annuel, avant et après les aides. Bientôt disponible ici.
              </p>
            </div>
            <span className="rounded-full bg-brand-jaune/50 px-3 py-1 text-xs font-bold text-brand-black">
              Bientôt
            </span>
          </div>
        </section>

        <BlocContact />
      </div>
    </div>
  );
}
