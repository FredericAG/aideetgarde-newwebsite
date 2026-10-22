import type { Metadata } from "next";
import Link from "next/link";
import { MentionsPrix } from "@/components/MentionsPrix";
import { ENTREPRISE } from "@/lib/entreprise";
import { formatEuros } from "@/lib/data";
import { FORMULES } from "@/lib/formules";

export const metadata: Metadata = {
  title: "Comment fonctionne Aide & Garde",
  description:
    "Aide & Garde gère pour vous les formalités de l'emploi de votre salarié à domicile : contrat, bulletins de paie, déclarations à l'Urssaf et documents de fin de contrat.",
};

/**
 * Page « Découvrir » : présentation du fonctionnement, page d'arrivée des
 * recommandations (lien de l'email, ?source=recommandation).
 * N'y figurent que des arguments vrais aujourd'hui (Arguments_marketing.md,
 * statut « Affichable ») ; les prix viennent de la grille des formules.
 */
const ETAPES = [
  {
    titre: "Créez votre compte et choisissez votre formule",
    texte: "Selon le nombre de salariés à domicile que vous employez. Sans engagement : résiliable en ligne à tout moment.",
  },
  {
    titre: "Présentez-nous votre salarié",
    texte: "Vous restez son employeur : nous établissons son contrat de travail selon la convention collective.",
  },
  {
    titre: "Chaque mois, indiquez les heures",
    texte: "Depuis votre espace, sur ordinateur ou téléphone. Nous établissons le bulletin de paie et déclarons le salaire à l'Urssaf (Pajemploi ou Cesu) en votre nom.",
  },
  {
    titre: "Retrouvez tout dans votre espace",
    texte: "Vous êtes prévenu dès qu'un document est en ligne. Bulletins, contrats et documents de fin de contrat restent disponibles à tout moment.",
  },
];

const COMPRIS = [
  "Le contrat de travail et ses avenants",
  "Un bulletin de paie détaillé chaque mois, avec le suivi des congés payés",
  "La déclaration du salaire à l'Urssaf (Pajemploi ou Cesu)",
  "Les documents de fin de contrat",
  "Un espace en ligne sécurisé, avec vos documents hébergés en France",
];

export default async function DecouvrirPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  const prixMin = Math.min(...FORMULES.map((f) => f.tarif));

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl">
        {source === "recommandation" && (
          <p className="mb-6 rounded-lg border-2 border-brand-jaune bg-brand-jaune/20 px-4 py-3 text-sm">
            Un de vos proches vous recommande Aide &amp; Garde : bienvenue ! Voici comment cela fonctionne.
          </p>
        )}

        <h1 className="font-display font-black text-3xl text-brand-teal">
          Employer à domicile, sans la paperasse
        </h1>
        <p className="mt-3 text-base leading-relaxed text-foreground/80">
          Garde d&apos;enfants, aide à domicile, employé de maison : {ENTREPRISE.nomCommercial} s&apos;occupe des
          formalités de l&apos;emploi de votre salarié. Vous restez son employeur, nous faisons le reste, à partir de{" "}
          <strong>{formatEuros(prixMin)} par mois</strong>.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/inscription" className="btn btn-primaire">
            Créer mon compte
          </Link>
          <Link href="/aide" className="btn btn-secondaire">
            Questions fréquentes
          </Link>
        </div>

        <section aria-labelledby="titre-etapes" className="mt-10">
          <h2 id="titre-etapes" className="font-bold text-xl text-brand-teal">Comment ça marche</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="carte flex gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-violet font-bold text-white"
                >
                  {i + 1}
                </span>
                <span className="text-sm">
                  <span className="block font-bold text-brand-black">{e.titre}</span>
                  {e.texte}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="titre-compris" className="mt-10">
          <h2 id="titre-compris" className="font-bold text-xl text-brand-teal">Ce qui est compris</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {COMPRIS.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden="true" className="font-bold text-brand-teal">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titre-prix" className="mt-10">
          <h2 id="titre-prix" className="font-bold text-xl text-brand-teal">Prix</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-4">
            {FORMULES.map((f) => (
              <li key={f.quota} className="carte p-4 text-center">
                <span className="block text-sm">Jusqu&apos;à {f.libelle}</span>
                <span className="mt-1 block text-xl font-bold text-brand-teal">{formatEuros(f.tarif)}</span>
                <span className="text-xs text-foreground/60">par mois</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <MentionsPrix />
          </div>
        </section>

        <section className="carte mt-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <strong className="text-brand-teal">Une question avant de vous lancer ?</strong> Appelez-nous au{" "}
            <a href={`tel:${ENTREPRISE.telephone.replace(/\s/g, "")}`} className="whitespace-nowrap underline">
              {ENTREPRISE.telephone}
            </a>{" "}
            ou écrivez à {ENTREPRISE.email}.
          </p>
          <Link href="/inscription" className="btn btn-primaire shrink-0 self-start sm:self-auto">
            Créer mon compte
          </Link>
        </section>
      </div>
    </div>
  );
}
