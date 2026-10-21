import { TableauDepliable } from "@/components/TableauDepliable";
import { LienTelechargement } from "@/components/LienTelechargement";
import {
  CATEGORIES_DOCUMENT,
  categorieDocument,
  libelleDocument,
  formatDate,
  formatPeriode,
  type DocumentRow,
} from "@/lib/data";

const th = "px-3 py-2";
const tdBase = "px-3 py-2 align-middle";

/**
 * Documents d'une gestion répartis en trois catégories (éléments
 * contractuels, bulletins de paie, autres), chacune dans un tableau aux
 * colonnes titrées et à la ligne de titres colorée (violet / turquoise /
 * orange, comme l'ancien espace client). Mêmes colonnes partout pour un
 * alignement vertical : Document (type et précision éventuelle, lien de
 * téléchargement), Période, date, action. On est déjà dans la gestion d'un
 * salarié : ni son nom ni celui de l'employeur ne sont répétés (retour du
 * 21/10). 5 documents par catégorie, puis dépliage.
 *
 * - vue « admin » : dernière colonne de date = premier téléchargement par
 *   l'abonné (tiret rouge s'il ne l'a pas encore fait).
 * - vue « abonne » : date de mise en ligne, pastille « Nouveau » ; sur
 *   téléphone, chaque document tient sur deux lignes compactes (classe
 *   « tableau-documents » de globals.css).
 */
export function DocumentsParCategorie({
  documents,
  vue,
  action,
}: {
  /** Documents de la gestion, déjà triés. */
  documents: DocumentRow[];
  vue: "admin" | "abonne";
  /** Contenu de la dernière colonne (supprimer, télécharger…). */
  action: (d: DocumentRow) => React.ReactNode;
}) {
  const admin = vue === "admin";
  // Côté abonné, les lignes alternées et l'affichage compact sur téléphone
  // viennent de la classe « tableau-documents » (globals.css).
  const td = admin
    ? `${tdBase} border-b border-brand-gray/15`
    : `${tdBase} sm:border-b sm:border-brand-gray/15`;
  return (
    <div className="mt-3 flex flex-col gap-5">
      {CATEGORIES_DOCUMENT.map((cat) => {
        const docs = documents.filter((d) => categorieDocument(d.type_document) === cat.cle);

        if (docs.length === 0) {
          return (
            <p key={cat.cle} className="flex items-center gap-x-2 text-sm">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-sm opacity-40"
                style={{ background: `var(--cat-${cat.cle})` }}
              />
              <span className="font-bold text-brand-teal">{cat.titre}</span>
              <span className="text-foreground/50">aucun document</span>
            </p>
          );
        }

        const tableau = (
          <TableauDepliable
            classeTable={admin ? "" : "tableau-documents"}
            classeEntete={`entete-${cat.cle}`}
            colonnes={
              <>
                <col />
                <col className="w-24" />
                <col className="w-32" />
                <col className={admin ? "w-14" : "w-40"} />
              </>
            }
            entete={
              <tr>
                <th className={th}>Document</th>
                <th className={th}>Période</th>
                <th
                  className={th}
                  title={admin ? "Premier téléchargement par l'abonné" : undefined}
                >
                  {admin ? "Téléchargé le" : "Mis en ligne le"}
                </th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            }
            lignes={docs.map((d) => (
              <tr key={d.id} className={admin ? "even:bg-[#f7f7f7] hover:bg-brand-sky-tint/20" : "hover:bg-brand-sky-tint/20"}>
                <td className={`${td} c-type break-words`}>
                  {d.storage_path ? (
                    <LienTelechargement documentId={d.id} className="font-medium text-brand-teal hover:underline">
                      {libelleDocument(d)}
                    </LienTelechargement>
                  ) : (
                    <span className="font-medium">{libelleDocument(d)}</span>
                  )}
                  {!admin && d.storage_path && !d.consulte_le && (
                    <span className="pastille-nouveau ml-2">Nouveau</span>
                  )}
                </td>
                <td className={`${td} c-periode tabular-nums`}>
                  {d.periode ? formatPeriode(d.periode) : "—"}
                </td>
                <td className={`${td} c-masque-mobile tabular-nums`}>
                  {!d.storage_path ? (
                    <span className="text-xs text-foreground/50">sans fichier</span>
                  ) : !admin ? (
                    formatDate(d.created_at)
                  ) : d.consulte_le ? (
                    formatDate(d.consulte_le)
                  ) : (
                    <span
                      className="font-bold text-red-600"
                      title="Pas encore téléchargé par l'abonné"
                    >
                      —<span className="sr-only">pas encore téléchargé</span>
                    </span>
                  )}
                </td>
                <td className={`${td} c-action text-right`}>{action(d)}</td>
              </tr>
            ))}
          />
        );

        return (
          <section key={cat.cle} aria-label={cat.titre}>
            <h3 className="flex flex-wrap items-center gap-x-2 text-sm">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: `var(--cat-${cat.cle})` }}
              />
              <span className="font-bold text-brand-teal">
                {cat.titre} ({docs.length})
              </span>
              <span className="text-xs text-foreground/50">{cat.aide}</span>
            </h3>
            <div className="mt-1">
              {admin ? (
                // Administration (ordinateur) : défilement horizontal si
                // la fenêtre est étroite.
                <div className="overflow-x-auto">
                  <div className="min-w-[36rem]">{tableau}</div>
                </div>
              ) : (
                tableau
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
