import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { TYPES_GESTION, formatDate, formatHeures, libelleMois } from "@/lib/data";
import {
  JOURS_ENTRE_RELANCES,
  LIBELLES_ETAT_PAIE,
  compterParEtat,
  comptesARelancer,
  decalerPeriode,
  lirePaieDuMois,
  periodeParDefaut,
  periodeValide,
  type EtatPaie,
  type LignePaie,
} from "@/lib/paie-du-mois";
import { contenuRelance } from "@/lib/relances";
import { RelanceGroupee } from "./RelanceGroupee";

export const metadata = { title: "Paie du mois — Administration Aide & Garde" };

const ORDRE: EtatPaie[] = ["a_traiter", "sans_declaration", "bulletin", "close"];
/** Au-delà, la liste est coupée : utiliser les filtres ou l'export. */
const LIGNES_AFFICHEES = 500;

const COULEURS: Record<EtatPaie, string> = {
  a_traiter: "bg-brand-violet text-white",
  sans_declaration: "bg-brand-jaune text-brand-black",
  bulletin: "bg-brand-teal text-white",
  close: "bg-brand-gray/30 text-foreground",
};

const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * « Paie du mois » (audit du 12/11/2026) : le travail mensuel par tâche.
 * Pour le mois choisi, chaque gestion est dans un seul état : déclaration à
 * traiter, sans déclaration (à relancer), bulletin en ligne, ou mois clos
 * sans bulletin. D'ici : exports pour le logiciel de paie, relance groupée,
 * accès direct à la fiche de chaque gestion.
 */
export default async function PaieDuMoisPage({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireAdmin("/admin/paie");
  const sp = await searchParams;
  const propose = periodeParDefaut();
  const demande = un(sp.mois);
  const periode = periodeValide(demande) ? demande : propose;
  const etatDemande = un(sp.etat);
  const filtre = etatDemande && etatDemande in LIBELLES_ETAT_PAIE ? (etatDemande as EtatPaie) : null;

  const lignes = await lirePaieDuMois(supabase, periode);
  const n = compterParEtat(lignes);
  const total = lignes.length;
  const { aRelancer, dejaRelances, sansEmail } = await comptesARelancer(supabase, lignes);
  const message = contenuRelance("declaration_mois", new Date(2000 + Number(periode.slice(0, 2)), Number(periode.slice(2, 4)) - 1, 15));

  const nomEmployeur = (l: LignePaie) => `${l.employeur.nom} ${l.employeur.prenom}`.trim().toLowerCase();
  const visibles = lignes
    .filter((l) => !filtre || l.etat === filtre)
    .sort(
      (a, b) =>
        ORDRE.indexOf(a.etat) - ORDRE.indexOf(b.etat) ||
        // Déclarations à traiter : les plus anciennes d'abord.
        (a.etat === "a_traiter" ? (a.declaration?.envoyee_le ?? "").localeCompare(b.declaration?.envoyee_le ?? "") : 0) ||
        nomEmployeur(a).localeCompare(nomEmployeur(b), "fr"),
    );
  const affichees = visibles.slice(0, LIGNES_AFFICHEES);
  const lien = (mois: string, etat?: EtatPaie | null) => `/admin/paie?mois=${mois}${etat ? `&etat=${etat}` : ""}`;
  const pourcent = total ? Math.round((n.bulletin / total) * 100) : 0;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-5xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Paie du mois</h1>

        {/* Choix du mois */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={lien(decalerPeriode(periode, -1))} className="btn btn-secondaire btn-sm" aria-label="Mois précédent">
            ‹ {maj(libelleMois(decalerPeriode(periode, -1)))}
          </Link>
          <span className="rounded-full bg-brand-violet px-4 py-1.5 text-sm font-bold text-white">{maj(libelleMois(periode))}</span>
          <Link href={lien(decalerPeriode(periode, 1))} className="btn btn-secondaire btn-sm" aria-label="Mois suivant">
            {maj(libelleMois(decalerPeriode(periode, 1)))} ›
          </Link>
          {periode !== propose && (
            <Link href={lien(propose)} className="ml-1 text-xs font-bold text-brand-teal underline">
              Revenir à {libelleMois(propose)}
            </Link>
          )}
        </div>

        {total === 0 ? (
          <p className="carte mt-6 p-4 text-sm text-foreground/75">Aucune gestion n&apos;est concernée par ce mois.</p>
        ) : (
          <>
            {/* Où en est le mois */}
            <section aria-label="Avancement du mois" className="mt-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ORDRE.map((e) => (
                  <Link
                    key={e}
                    href={lien(periode, filtre === e ? null : e)}
                    aria-current={filtre === e ? "true" : undefined}
                    className={`carte block border-2 p-3 ${filtre === e ? "border-brand-violet" : "border-transparent"}`}
                  >
                    <span className="block text-2xl font-bold tabular-nums text-brand-teal">{n[e]}</span>
                    <span className="block text-sm">{LIBELLES_ETAT_PAIE[e]}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-gray/25" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand-teal" style={{ width: `${pourcent}%` }} />
                </div>
                <span className="tabular-nums">
                  <strong>
                    {n.bulletin} / {total}
                  </strong>{" "}
                  bulletins en ligne
                </span>
              </div>
            </section>

            {/* Actions du mois */}
            <section aria-label="Actions du mois" className="carte mt-4 flex flex-col gap-3 p-4 text-sm">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <a href={`/admin/paie/export?mois=${periode}&etat=a_traiter`} download className="btn btn-primaire btn-sm">
                  ⬇ Déclarations à traiter ({n.a_traiter})
                </a>
                <a href={`/admin/paie/export?mois=${periode}`} download className="btn btn-secondaire btn-sm">
                  ⬇ Tout le mois ({total})
                </a>
                <Link href="/admin/depot" className="btn btn-secondaire btn-sm">
                  Déposer les bulletins ›
                </Link>
              </div>
              <p className="text-xs text-foreground/70">
                Fichiers CSV pour le logiciel de paie : une ligne de titres, puis une ligne par gestion, toujours les mêmes
                colonnes. Une déclaration passe en « bulletin en ligne » dès que son bulletin est déposé.
              </p>
              {n.sans_declaration > 0 && (
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-t border-brand-gray/20 pt-3">
                  <RelanceGroupee
                    periode={periode}
                    nombre={aRelancer.length}
                    exemples={aRelancer.slice(0, 4).map((c) => `${c.prenom} ${c.nom}`.trim())}
                    sujet={message.sujet}
                    paragraphes={message.paragraphes}
                    joursEntreRelances={JOURS_ENTRE_RELANCES}
                  />
                  <span className="text-xs text-foreground/70">
                    {dejaRelances.size > 0 && `${dejaRelances.size} abonné(s) déjà relancé(s) depuis moins de ${JOURS_ENTRE_RELANCES} jours. `}
                    {sansEmail > 0 && `${sansEmail} gestion(s) sans adresse email. `}
                    Les gestions terminées ne sont pas relancées.
                  </span>
                </div>
              )}
            </section>

            {/* Liste */}
            <nav aria-label="Filtrer par état" className="mt-6 flex flex-wrap gap-2 text-sm">
              <Link href={lien(periode)} className={`btn btn-sm ${filtre ? "btn-secondaire" : "btn-primaire"}`}>
                Tout ({total})
              </Link>
              {ORDRE.map((e) => (
                <Link key={e} href={lien(periode, e)} className={`btn btn-sm ${filtre === e ? "btn-primaire" : "btn-secondaire"}`}>
                  {LIBELLES_ETAT_PAIE[e]} ({n[e]})
                </Link>
              ))}
            </nav>

            <div className="mt-3 overflow-x-auto rounded-xl border border-brand-gray/25">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="entete-liste">
                  <tr>
                    <th scope="col" className="px-3 py-2">Réf.</th>
                    <th scope="col" className="px-3 py-2">Employeur</th>
                    <th scope="col" className="px-3 py-2">Salarié</th>
                    <th scope="col" className="px-3 py-2">État</th>
                    <th scope="col" className="px-3 py-2">Déclaration</th>
                    <th scope="col" className="px-3 py-2">Contrat</th>
                  </tr>
                </thead>
                <tbody>
                  {affichees.map((l) => {
                    const g = l.gestion;
                    const fiche = `/admin/comptes/${g.employeur_id}?gestion=${g.id}#gestion-${g.id}`;
                    const relance = dejaRelances.get(g.employeur_id);
                    return (
                      <tr key={g.id} className="border-t border-brand-gray/15 align-top even:bg-[#f7f7f7]">
                        <td className="px-3 py-2 font-mono text-xs">{g.reference}</td>
                        <td className="px-3 py-2">
                          <Link href={fiche} className="font-bold text-brand-teal underline">
                            {`${l.employeur.prenom} ${l.employeur.nom}`.trim() || "—"}
                          </Link>
                          {l.employeur.reference_client && (
                            <span className="block font-mono text-xs text-foreground/70">{l.employeur.reference_client}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {`${g.prenom_salarie} ${g.nom_salarie}`.trim()}
                          <span className="block text-xs text-foreground/70">
                            {TYPES_GESTION[g.type_gestion]}
                            {g.statut === "terminee" && g.date_fin ? ` · terminée le ${formatDate(g.date_fin)}` : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${COULEURS[l.etat]}`}>
                            {l.declaration?.correction ? "Correction demandée" : LIBELLES_ETAT_PAIE[l.etat]}
                          </span>
                          {l.etat === "sans_declaration" && relance && (
                            <span className="mt-0.5 block text-xs text-foreground/70">relancé le {formatDate(relance)}</span>
                          )}
                          {l.bulletin_le && (
                            <span className="mt-0.5 block text-xs text-foreground/70">bulletin du {formatDate(l.bulletin_le)}</span>
                          )}
                        </td>
                        <td className="max-w-xs px-3 py-2">
                          {l.declaration ? (
                            <>
                              <span className="font-bold tabular-nums">
                                {l.declaration.heures === null ? "Heures du contrat" : formatHeures(l.declaration.heures)}
                              </span>
                              <span className="text-xs text-foreground/70"> · reçue le {formatDate(l.declaration.envoyee_le)}</span>
                              {l.declaration.commentaire && <span className="mt-0.5 block whitespace-pre-line text-xs">« {l.declaration.commentaire} »</span>}
                              {l.declaration.motif_modification && (
                                <span className="mt-0.5 block whitespace-pre-line text-xs font-bold text-brand-violet">
                                  Correction : {l.declaration.motif_modification}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-foreground/60">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">
                          {g.heures !== null && g.heures !== undefined
                            ? `${formatHeures(g.heures)} ${g.unite_heures === "semaine" ? "par semaine" : "par mois"}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibles.length > affichees.length && (
              <p className="mt-2 text-xs text-foreground/70">
                {affichees.length} lignes affichées sur {visibles.length} : filtrez par état, ou téléchargez le fichier du mois.
              </p>
            )}
          </>
        )}

        {/* Exports qui ne dépendent pas du mois */}
        <section aria-label="Exports des gestions" className="mt-8 border-t border-brand-gray/20 pt-5 text-sm">
          <h2 className="font-bold text-brand-teal">Formulaires des gestions</h2>
          <p className="mt-1 text-xs text-foreground/70">
            Le même fichier que « Télécharger le formulaire (CSV) » d&apos;une fiche, avec une ligne par gestion.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href="/admin/gestions/export?statut=envoyee" download className="btn btn-secondaire btn-sm">
              ⬇ Gestions à valider
            </a>
            <a href="/admin/gestions/export?statut=en_cours" download className="btn btn-secondaire btn-sm">
              ⬇ Gestions en cours
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
