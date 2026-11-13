import Link from "next/link";
import { ENTREPRISE } from "@/lib/entreprise";

/**
 * « Mes gestions » sans aucun salarié (demande du 07/11/2026) : ce que la
 * page contiendra, les étapes pour y arriver et un aperçu de l'espace
 * (données fictives). Sans abonnement actif, « Ajouter un salarié » mène
 * d'abord au choix de la formule.
 */
export function PremiereGestion({ abonne }: { abonne: boolean }) {
  const lienAjout = abonne ? "/tableau-de-bord/gestions/nouvelle" : "/tableau-de-bord/abonnement";
  const etapes: { titre: string; texte: string; fait?: boolean }[] = [
    {
      titre: "Choisissez votre formule",
      texte: "Selon le nombre de salariés que vous employez. Sans engagement, résiliable en ligne.",
      fait: abonne,
    },
    {
      titre: "Ajoutez votre salarié",
      texte: "Quelques minutes : son emploi, son contrat, ses horaires. Vous pouvez enregistrer un brouillon et finir plus tard.",
    },
    {
      titre: "Retrouvez ses documents ici",
      texte: "Nous établissons ses bulletins chaque mois et préparons ses documents. Vous êtes prévenu dès qu'un document est en ligne.",
    },
  ];

  return (
    <>
      <p className="mt-3 text-foreground/80">
        C&apos;est ici que vous retrouverez tout ce qui concerne chacun de vos salariés : ses <strong>bulletins de paie</strong>,
        son <strong>contrat</strong>, ses <strong>attestations</strong> et les <strong>courriers prêts à envoyer</strong>.
        C&apos;est aussi d&apos;ici que vous nous signalez ce qui change : heures du mois, absence, fin de contrat.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link href={lienAjout} className="btn btn-primaire self-start">
          + Ajouter un salarié
        </Link>
        {!abonne && (
          <p className="text-sm text-foreground/70">Vous choisirez d&apos;abord votre formule, puis vous ajouterez votre salarié.</p>
        )}
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {etapes.map((e, i) => (
          <li key={e.titre} className="carte flex gap-3 p-4">
            <span
              aria-hidden="true"
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                e.fait ? "bg-brand-teal text-white" : "bg-brand-jaune text-brand-black"
              }`}
            >
              {e.fait ? "✓" : i + 1}
            </span>
            <span>
              <span className="block font-bold text-brand-teal">
                {e.titre}
                {e.fait && <span className="sr-only"> (fait)</span>}
              </span>
              <span className="mt-1 block text-sm text-foreground/75">{e.texte}</span>
            </span>
          </li>
        ))}
      </ol>

      <section className="mt-10" aria-labelledby="titre-apercu">
        <h2 id="titre-apercu" className="font-bold text-brand-teal">
          À quoi ressemblera votre espace
        </h2>
        <p className="mt-1 text-xs text-foreground/60">Exemple, avec des données fictives.</p>
        <Apercu />
      </section>

      <p className="mt-8 text-sm text-foreground/70">
        Une question avant de commencer ? Un conseiller vous répond gratuitement au{" "}
        <a href={`tel:${ENTREPRISE.telephone.replace(/\s/g, "").replace(/^0/, "+33")}`} className="font-medium text-brand-teal underline">
          {ENTREPRISE.telephone}
        </a>
        .
      </p>
    </>
  );
}

/** Aperçu décoratif d'une gestion ouverte (ni lien ni donnée réelle). */
function Apercu() {
  const categories: { titre: string; couleur: string; lignes: [string, string][] }[] = [
    {
      titre: "Bulletins de paie",
      couleur: "bg-brand-violet",
      lignes: [
        ["Bulletin de paie", "Octobre 2026"],
        ["Bulletin de paie", "Septembre 2026"],
      ],
    },
    { titre: "Contrat", couleur: "bg-brand-teal", lignes: [["Contrat de travail (CDI)", "Septembre 2026"]] },
  ];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mt-3 select-none overflow-hidden rounded-2xl border border-brand-gray/25 bg-white shadow-[0_12px_32px_rgba(28,46,62,0.12)]"
    >
      <div className="flex items-center gap-1.5 border-b border-brand-gray/15 bg-[var(--carte)] px-4 py-2">
        <span className="size-2.5 rounded-full bg-brand-gray/40" />
        <span className="size-2.5 rounded-full bg-brand-gray/40" />
        <span className="size-2.5 rounded-full bg-brand-gray/40" />
        <span className="ml-3 text-xs font-medium text-foreground/60">Mes gestions</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
          <span className="rounded-full border-2 border-brand-jaune bg-brand-violet px-3 py-1 text-white">
            Marie · Garde d&apos;enfants
          </span>
          <span className="rounded-full border-2 border-brand-jaune bg-white px-3 py-1 text-brand-teal">Paul · Aide à domicile</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-jaune/40 p-3">
          <span>
            <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-brand-violet">Nouveau</span>
            <span className="block text-sm font-bold text-brand-black">Bulletin de paie d&apos;octobre 2026</span>
          </span>
          <span className="rounded-full bg-brand-violet px-4 py-1.5 text-xs font-bold text-white">Télécharger</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {["Demander le bulletin du mois", "Déclarer un arrêt maladie", "Obtenir une attestation", "Prévoir une fin de contrat"].map((a) => (
            <span key={a} className="rounded-full border border-brand-teal/40 px-3 py-1 font-medium text-brand-teal">
              {a}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {categories.map((c) => (
            <div key={c.titre} className="overflow-hidden rounded-lg border border-brand-gray/20 text-xs sm:text-sm">
              <p className={`${c.couleur} px-3 py-1.5 font-bold text-white`}>{c.titre}</p>
              {c.lignes.map(([doc, periode], i) => (
                <p key={doc + periode} className={`flex justify-between gap-3 px-3 py-1.5 ${i % 2 ? "bg-[#f7f7f7]" : "bg-white"}`}>
                  <span className="font-medium text-brand-black">{doc}</span>
                  <span className="text-foreground/60">{periode}</span>
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
