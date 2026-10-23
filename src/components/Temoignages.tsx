import { ACompleter } from "@/components/ACompleter";
import { ENTREPRISE } from "@/lib/entreprise";
import { temoignagesAffiches, type Temoignage } from "@/lib/temoignages";
import { lireFicheGoogle, type AvisGoogle } from "@/lib/avis-google";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function dateLisible(d: string | null): string | null {
  const m = d?.match(/^(\d{4})-(\d{2})$/);
  return m ? `${MOIS[Number(m[2]) - 1]} ${m[1]}` : null;
}

function Carte({ t }: { t: Temoignage & { aObtenir: boolean } }) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-brand-gray/20 bg-white p-5">
      <span aria-hidden="true" className="font-display text-3xl font-black leading-none text-brand-violet/40">
        «
      </span>
      <blockquote className="mt-1 flex-1 text-sm leading-relaxed text-foreground/85">{t.texte}</blockquote>
      <figcaption className="mt-4 text-xs text-foreground/60">
        <strong className="text-brand-teal">{t.initiales}</strong>
        {" · "}
        <ACompleter valeur={dateLisible(t.date)} quoi="mois et année" />
        {t.aObtenir && (
          <mark className="ml-2 rounded bg-brand-jaune px-1 text-brand-black" title="Masqué sur le site public tant que l'accord n'est pas noté (src/lib/temoignages.ts)">
            [accord à obtenir]
          </mark>
        )}
      </figcaption>
    </figure>
  );
}

/** Étoiles pleines / vides, avec la note lue par les lecteurs d'écran. */
function Etoiles({ note, taille = "text-sm" }: { note: number; taille?: string }) {
  const pleines = Math.round(note);
  return (
    <span className={`${taille} tracking-tight text-[#f2b01e]`} role="img" aria-label={`Note : ${String(note).replace(".", ",")} sur 5`}>
      {"★".repeat(pleines)}
      <span className="text-brand-gray/30">{"★".repeat(Math.max(0, 5 - pleines))}</span>
    </span>
  );
}

/** Avis Google affiché tel que Google le fournit (auteur, note, texte, lien). */
function CarteGoogle({ a }: { a: AvisGoogle }) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-brand-gray/20 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <Etoiles note={a.note} />
        <span className="text-[0.65rem] font-medium text-foreground/50">Avis Google</span>
      </div>
      <blockquote className="mt-3 line-clamp-6 flex-1 text-sm leading-relaxed text-foreground/85">{a.texte}</blockquote>
      <figcaption className="mt-4 flex items-center gap-2 text-xs text-foreground/60">
        {a.auteurPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.auteurPhoto} alt="" width={24} height={24} className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
        )}
        <span>
          {a.auteurLien ? (
            <a href={a.auteurLien} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-teal hover:underline">
              {a.auteur}
            </a>
          ) : (
            <strong className="text-brand-teal">{a.auteur}</strong>
          )}
          {a.quand && ` · ${a.quand}`}
          {a.lien && (
            <>
              {" · "}
              <a href={a.lien} target="_blank" rel="noopener noreferrer" className="underline">
                Lire sur Google
              </a>
            </>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Témoignages de clients, avec les informations exigées pour la publication
 * d'avis (Code de la consommation, art. L111-7-2 et D111-17) : date,
 * absence de procédure de contrôle par un tiers, absence de contrepartie,
 * critère de classement. Lien vers les avis Google, publics, quand il est
 * renseigné (src/lib/entreprise.ts).
 */
export async function Temoignages() {
  const liste = temoignagesAffiches();
  const fiche = await lireFicheGoogle();
  const lienGoogle = ENTREPRISE.avisGoogle ?? fiche?.lien ?? null;
  if (liste.length === 0 && !fiche && !lienGoogle) return null;
  const enAvant = liste.filter((t) => t.enAvant);
  const autres = liste.filter((t) => !t.enAvant);

  return (
    <section aria-labelledby="titre-temoignages" className="px-4 py-14 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="titre-temoignages" className="font-display font-black text-2xl text-brand-teal sm:text-3xl">
            Ce que nos clients en disent
          </h2>
          {fiche?.note != null ? (
            <a
              href={lienGoogle ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-brand-gray/25 bg-white px-4 py-2 text-sm hover:border-brand-teal"
            >
              <strong className="text-lg text-brand-black">{fiche.note.toFixed(1).replace(".", ",")}</strong>
              <Etoiles note={fiche.note} taille="text-base" />
              <span className="text-foreground/70">
                {fiche.nombre} avis Google ↗
              </span>
            </a>
          ) : (
            lienGoogle && (
              <a href={lienGoogle} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-teal underline">
                Voir nos avis sur Google ↗
              </a>
            )
          )}
        </div>
        {fiche && fiche.avis.length > 0 && (
          <>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fiche.avis.map((a, i) => (
                <li key={i}>
                  <CarteGoogle a={a} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.7rem] leading-snug text-foreground/55">
              Avis publiés sur Google : sélection et ordre établis par Google, note moyenne calculée par Google sur{" "}
              {fiche.nombre} avis.
            </p>
            {liste.length > 0 && (
              <h3 className="mt-10 font-bold text-lg text-brand-teal">Extraits de messages reçus</h3>
            )}
          </>
        )}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enAvant.map((t, i) => (
            <li key={i}>
              <Carte t={t} />
            </li>
          ))}
        </ul>
        {autres.length > 0 && (
          <details className="group mt-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-brand-teal underline">
              <span className="group-open:hidden">Voir {autres.length} autres témoignages</span>
              <span className="hidden group-open:inline">Masquer</span>
            </summary>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {autres.map((t, i) => (
                <li key={i}>
                  <Carte t={t} />
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="mt-6 text-[0.7rem] leading-snug text-foreground/55">
          Extraits de messages adressés à {ENTREPRISE.nomCommercial} par ses clients, publiés avec leur accord sous
          leurs initiales et datés du mois de l&apos;échange, du plus récent au plus ancien. Sélection faite par{" "}
          {ENTREPRISE.nomCommercial}, sans procédure de contrôle par un organisme extérieur ; aucune contrepartie
          n&apos;est accordée.
        </p>
      </div>
    </section>
  );
}
