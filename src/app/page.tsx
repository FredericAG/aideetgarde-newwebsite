import type { Metadata } from "next";
import Link from "next/link";
import { MentionsPrix } from "@/components/MentionsPrix";
import { Temoignages } from "@/components/Temoignages";
import { ENTREPRISE } from "@/lib/entreprise";
import { formatEuros } from "@/lib/data";
import { FORMULES } from "@/lib/formules";

/**
 * Page d'accueil (23/10/2026). Reprend les arguments de l'ancien site
 * (service RH de l'emploi à domicile, conseiller, 3 étapes, 12,90 € / mois,
 * sans engagement, crédit d'impôt) et ajoute ceux issus de la refonte
 * (données hébergées en France, documents privés, notifications, résiliation
 * en ligne). Règle : n'afficher que des arguments vrais (Arguments_marketing.md)
 * et aller à l'essentiel — un seul appel à l'action, « Commencer ».
 *
 * Référencement : un seul H1, titres H2 par section, texte réel (pas
 * d'image de texte), données structurées schema.org (organisme et service).
 * Les recommandations (?source=recommandation) arrivent aussi ici.
 */
export const metadata: Metadata = {
  title: "Aide & Garde — le service RH de l'emploi à domicile",
  description:
    "Contrat de travail, bulletins de paie, déclarations Pajemploi et Cesu, fin de contrat : Aide & Garde fait toutes les démarches de l'emploi à domicile à votre place. 12,90 € par mois, sans engagement.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Aide & Garde — le service RH de l'emploi à domicile",
    description:
      "Toutes les démarches de l'emploi à domicile faites à votre place, à partir de 12,90 € par mois, sans engagement.",
    type: "website",
    locale: "fr_FR",
  },
};

const prixMin = Math.min(...FORMULES.map((f) => f.tarif));

const EMPLOIS = ["Garde d'enfants", "Garde partagée", "Aide à domicile", "Auxiliaire de vie", "Ménage et entretien"];

const ETAPES = [
  {
    titre: "L'embauche",
    texte: "Vous nous présentez votre salarié : nous préparons son contrat de travail, conforme à la convention collective.",
  },
  {
    titre: "Chaque mois",
    texte: "Vous indiquez les heures, sur ordinateur ou téléphone. Nous établissons le bulletin de paie et déclarons le salaire à l'Urssaf.",
  },
  {
    titre: "La fin du contrat",
    texte: "Démission, licenciement, rupture conventionnelle : nous vous guidons et préparons les documents obligatoires.",
  },
];

const ATOUTS = [
  { titre: "Tout est fait à votre place", texte: "Contrat, paie, congés, déclarations, fin de contrat : vous n'avez plus de démarches à suivre." },
  { titre: "Un conseiller qui vous répond", texte: `Une question sur votre situation ? Appelez-nous au ${ENTREPRISE.telephone} (appel non surtaxé).` },
  { titre: "Vos données protégées", texte: "Hébergées en France, à Paris. Vos documents sont privés : vous seul y avez accès." },
  { titre: "Prévenu sur votre téléphone", texte: "Dès qu'un bulletin est prêt, une notification vous prévient. Tout reste disponible dans votre espace." },
  { titre: "Sans engagement", texte: "Abonnement mensuel, résiliable en ligne à tout moment, en quelques clics." },
  { titre: "Organisme déclaré", texte: "Services à la personne, n° SAP 838154383 : votre abonnement ouvre droit au crédit d'impôt." },
];

const QUESTIONS = [
  {
    q: "Qui est l'employeur de mon salarié ?",
    r: "Vous. Aide & Garde est votre mandataire : nous faisons les démarches en votre nom, vous gardez le choix de votre salarié et l'organisation de son travail.",
  },
  {
    q: "Que comprend le prix ?",
    r: `Toutes les démarches pour le nombre de salariés de votre formule, à partir de ${formatEuros(prixMin)} par mois. Le salaire et les cotisations de votre salarié restent à votre charge.`,
  },
  {
    q: "Puis-je arrêter quand je veux ?",
    r: "Oui : l'abonnement est sans engagement et se résilie en ligne, avec effet à la fin du mois.",
  },
  {
    q: "Où sont mes données ?",
    r: "En France, à Paris. Vos bulletins et documents ne circulent pas en pièce jointe : ils restent dans votre espace sécurisé.",
  },
];

/** Données structurées pour les moteurs de recherche (schema.org). */
function DonneesStructurees() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aideetgarde.fr";
  const donnees = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site}/#organisation`,
        name: ENTREPRISE.nomCommercial,
        legalName: ENTREPRISE.denomination ?? undefined,
        url: site,
        telephone: "+33188320118",
        email: ENTREPRISE.email,
        foundingDate: "2018",
        address: { "@type": "PostalAddress", streetAddress: "131 rue du Temple", postalCode: "75003", addressLocality: "Paris", addressCountry: "FR" },
      },
      {
        "@type": "Service",
        name: "Gestion administrative de l'emploi à domicile",
        serviceType: "Mandataire en emploi direct (services à la personne)",
        provider: { "@id": `${site}/#organisation` },
        areaServed: "FR",
        offers: FORMULES.map((f) => ({
          "@type": "Offer",
          name: `Abonnement ${f.libelle}`,
          price: f.tarif.toFixed(2),
          priceCurrency: "EUR",
          priceSpecification: { "@type": "UnitPriceSpecification", price: f.tarif.toFixed(2), priceCurrency: "EUR", unitText: "MON" },
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: QUESTIONS.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.r } })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees) }} />;
}

/** Illustration : l'espace sur téléphone (décorative, sans données réelles). */
function Telephone() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-64 select-none sm:w-72">
      <div className="rounded-[2.2rem] border-[6px] border-brand-black bg-white p-3 shadow-[0_18px_40px_rgba(28,46,62,0.18)]">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-brand-black/15" />
        <div className="rounded-xl bg-brand-jaune/40 p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-brand-violet">Nouveau</p>
          <p className="text-sm font-bold text-brand-black">Bulletin d&apos;octobre disponible</p>
          <p className="text-xs text-foreground/70">Marie · garde d&apos;enfants</p>
        </div>
        <div className="mt-3 space-y-2">
          {[
            ["Déclarer novembre", "1 minute"],
            ["Contrat de travail", "Signé"],
            ["Déclaration Urssaf", "Faite pour vous"],
          ].map(([a, b]) => (
            <div key={a} className="flex items-center justify-between rounded-lg bg-[var(--carte)] px-3 py-2 text-xs">
              <span className="font-medium text-brand-black">{a}</span>
              <span className="text-brand-teal">{b}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-full bg-brand-violet py-2 text-center text-xs font-bold text-white">Télécharger</div>
      </div>
    </div>
  );
}

export default async function Accueil({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <DonneesStructurees />

      {/* ------------------------------------------------------------ Héros */}
      <section className="bg-white px-4 pb-14 pt-10 sm:px-6 sm:pt-16">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1.25fr_1fr]">
          <div>
            {source === "recommandation" && (
              <p className="mb-5 inline-block rounded-full bg-brand-jaune px-4 py-1.5 text-sm font-medium text-brand-black">
                Un de vos proches vous recommande Aide &amp; Garde : bienvenue !
              </p>
            )}
            <p className="text-sm font-bold uppercase tracking-wide text-brand-violet">
              Le service RH de l&apos;emploi à domicile
            </p>
            <h1 className="mt-3 font-display font-black text-3xl leading-tight text-brand-teal sm:text-5xl">
              Employer à domicile, sans la paperasse
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-foreground/80">
              Contrat de travail, paie, déclarations, fin de contrat : nous faisons toutes les démarches à votre
              place. Vous gardez l&apos;essentiel, la relation avec votre salarié.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/inscription" className="btn btn-primaire btn-lg">
                Commencer
              </Link>
              <a href="#comment" className="btn btn-secondaire btn-lg">
                Comment ça marche
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/75">
              <li>✓ À partir de {formatEuros(prixMin)} par mois</li>
              <li>✓ Sans engagement</li>
              <li>✓ Données hébergées en France</li>
            </ul>
          </div>
          <Telephone />
        </div>
      </section>

      {/* ------------------------------------------------------ Pour qui */}
      <section aria-label="Les emplois que nous gérons" className="border-y border-brand-gray/15 bg-[var(--carte)] px-4 py-5 sm:px-6">
        <ul className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-2">
          {EMPLOIS.map((e) => (
            <li key={e} className="rounded-full border-2 border-brand-jaune bg-white px-4 py-1.5 text-sm font-medium text-brand-teal">
              {e}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------- Comment ça marche */}
      <section id="comment" className="scroll-mt-24 px-4 py-14 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="font-display font-black text-2xl text-brand-teal sm:text-3xl">Comment ça marche</h2>
          <p className="mt-2 text-foreground/70">Trois moments clés, un seul interlocuteur : Aide &amp; Garde.</p>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="carte p-5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-violet font-bold text-white"
                >
                  {i + 1}
                </span>
                <h3 className="mt-3 font-bold text-lg text-brand-black">{e.titre}</h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground/80">{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------ Atouts */}
      <section className="bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="font-display font-black text-2xl text-brand-teal sm:text-3xl">Pourquoi Aide &amp; Garde</h2>
          <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {ATOUTS.map((a) => (
              <li key={a.titre} className="border-l-4 border-brand-jaune pl-4">
                <h3 className="font-bold text-brand-black">{a.titre}</h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground/75">{a.texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------- Témoignages */}
      <Temoignages />

      {/* -------------------------------------------------------- Prix */}
      <section id="tarifs" className="scroll-mt-24 px-4 py-14 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="font-display font-black text-2xl text-brand-teal sm:text-3xl">Un prix simple</h2>
          <p className="mt-2 text-foreground/70">Selon le nombre de salariés que vous employez. Tout est compris.</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {FORMULES.map((f, i) => (
              <li
                key={f.quota}
                className={`rounded-xl border-2 bg-white p-5 text-center ${i === 0 ? "border-brand-violet" : "border-brand-gray/20"}`}
              >
                <span className="block text-sm text-foreground/75">Jusqu&apos;à {f.libelle}</span>
                <span className="mt-1 block font-display font-black text-3xl text-brand-teal">{formatEuros(f.tarif)}</span>
                <span className="text-xs text-foreground/60">par mois</span>
                <span className="mt-2 block text-xs font-medium text-brand-violet">
                  soit {formatEuros(f.tarif / 2)} après crédit d&apos;impôt
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-center">
            <Link href="/inscription" className="btn btn-primaire btn-lg">
              Commencer
            </Link>
          </div>
          <div className="mt-8">
            <MentionsPrix />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Conseil */}
      <section className="bg-brand-teal px-4 py-12 text-white sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display font-black text-2xl">Une question sur votre situation ?</h2>
            <p className="mt-2 max-w-xl text-white/85">
              Coût de l&apos;emploi, aides, contrat, fin de contrat : parlez gratuitement à un conseiller, ou trouvez
              la réponse dans notre centre d&apos;aide.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={`tel:${ENTREPRISE.telephone.replace(/\s/g, "")}`}
              className="btn btn-lg whitespace-nowrap border-2 border-brand-jaune bg-brand-jaune text-brand-black"
            >
              {ENTREPRISE.telephone}
            </a>
            <Link href="/aide" className="btn btn-lg whitespace-nowrap border-2 border-white/70 bg-transparent text-white">
              Centre d&apos;aide
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Questions */}
      <section className="bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="font-display font-black text-2xl text-brand-teal sm:text-3xl">Questions fréquentes</h2>
          <div className="mt-6 flex flex-col gap-3">
            {QUESTIONS.map((x) => (
              <details key={x.q} className="carte group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold text-brand-teal">
                  {x.q}
                  <span aria-hidden="true" className="text-brand-violet transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <p className="border-t border-brand-gray/15 bg-white px-4 py-3 text-sm leading-relaxed text-foreground/85">{x.r}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 text-sm">
            <Link href="/aide" className="font-medium text-brand-teal underline">
              Toutes les réponses dans le centre d&apos;aide ›
            </Link>
          </p>
        </div>
      </section>

      {/* -------------------------------------------------- Appel final */}
      <section className="px-4 py-14 text-center sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="font-display font-black text-2xl text-brand-teal sm:text-3xl">
            Toutes les démarches de l&apos;emploi à domicile, gérées à votre place
          </h2>
          <p className="mt-3 text-foreground/75">Créez votre compte en 2 minutes. Sans engagement.</p>
          <Link href="/inscription" className="btn btn-primaire btn-lg mt-6">
            Commencer
          </Link>
        </div>
      </section>
    </div>
  );
}
