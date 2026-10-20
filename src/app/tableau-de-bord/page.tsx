import Link from "next/link";
import { TitreDocument } from "@/components/TitreDocument";
import { NotificationsPush } from "@/components/NotificationsPush";
import { NouveauxDocuments } from "@/components/NouveauxDocuments";
import { requireUser } from "@/lib/auth";
import {
  TYPES_DOCUMENT,
  TYPES_GESTION,
  formatDate,
  formatPeriode,
  formatEuros,
  libelleMois,
  nomSalarie,
  periodesDeclarables,
  type Abonnement,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";

/**
 * Tableau de bord de l'employeur (brique 2) : lecture seule. Les données
 * (abonnement, gestions, documents) sont créées pour l'instant depuis
 * l'espace /admin ; l'employeur, lui, ne fait que les consulter.
 *
 * Important : on filtre explicitement sur `employeur_id = user.id`. Pour un
 * employeur, la base ne lui renverrait de toute façon que ses lignes (RLS) ;
 * mais un administrateur qui ouvre cette page verrait sinon les données de
 * TOUS les comptes mélangées.
 */
export default async function TableauDeBordPage() {
  const { supabase, user, profile } = await requireUser("/tableau-de-bord");

  const moisCourant = periodesDeclarables().parDefaut;

  const [abosRes, gestionsRes, docsRes, declsRes, nouveauxRes, bulletinsRes] = await Promise.all([
    supabase
      .from("abonnements")
      .select("*")
      .eq("employeur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("gestions")
      .select("*")
      .eq("employeur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, storage_path, created_at, consulte_le")
      .eq("employeur_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("declarations_mensuelles")
      .select("gestion_id, statut")
      .eq("employeur_id", user.id)
      .eq("periode", moisCourant),
    // Documents pas encore téléchargés, mis en avant en haut de page.
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, storage_path, created_at, consulte_le")
      .eq("employeur_id", user.id)
      .is("consulte_le", null)
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),
    // Bulletins en ligne, du plus récent au plus ancien : le premier de
    // chaque gestion alimente la colonne « Dernier bulletin ».
    supabase
      .from("documents")
      .select("id, gestion_id, periode, consulte_le")
      .eq("employeur_id", user.id)
      .eq("type_document", "bulletin")
      .not("storage_path", "is", null)
      .order("periode", { ascending: false, nullsFirst: false })
      .limit(300),
  ]);

  const erreur = abosRes.error || gestionsRes.error || docsRes.error;
  // declsRes.error n'est pas bloquant : sans le script brique7a, la
  // colonne « déclaration » affiche simplement le bouton.
  const abonnements = (abosRes.data ?? []) as Abonnement[];
  const gestions = (gestionsRes.data ?? []) as Gestion[];
  const documents = (docsRes.data ?? []) as DocumentRow[];

  const abonnement =
    abonnements.find((a) => a.statut === "actif") ?? abonnements[0] ?? null;
  const enCours = gestions.filter((g) => g.statut === "en_cours");
  const terminees = gestions.filter((g) => g.statut === "terminee");
  const gestionParId = new Map(gestions.map((g) => [g.id, g]));
  const dernierBulletin = new Map<
    string,
    { id: string; periode: string | null; consulte_le: string | null }
  >();
  for (const b of bulletinsRes.data ?? []) {
    if (!dernierBulletin.has(b.gestion_id)) dernierBulletin.set(b.gestion_id, b);
  }
  const statutDeclaration = new Map(
    (declsRes.data ?? []).map((d) => [d.gestion_id as string, d.statut as string]),
  );

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Tableau de bord
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Bonjour {profile?.prenom || user.email} · inscrit le{" "}
          {formatDate(profile?.created_at)}.
        </p>

        {erreur && (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Impossible de charger toutes vos données pour le moment. Réessayez
            dans un instant.
          </p>
        )}

        <NouveauxDocuments
          documents={(nouveauxRes.data ?? []) as DocumentRow[]}
          nomSalarie={(d) => {
            const g = gestionParId.get(d.gestion_id);
            return g ? nomSalarie(g) : "";
          }}
        />

        <NotificationsPush compact />

        {/* --- Abonnement --- */}
        <section className="carte mt-8 p-5">
          <h2 className="font-bold text-brand-teal">Mon abonnement</h2>
          {abonnement ? (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-foreground/60">Statut</dt>
                <dd className="font-medium">
                  {abonnement.statut === "actif" ? (
                    <span className="text-brand-teal">Actif</span>
                  ) : (
                    <span className="text-red-600">
                      Résilié le {formatDate(abonnement.date_fin)}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-foreground/60">Gestions en cours</dt>
                <dd className="font-medium">
                  {enCours.length} / {abonnement.quota_gestions}
                </dd>
              </div>
              <div>
                <dt className="text-foreground/60">Tarif mensuel</dt>
                <dd className="font-medium">
                  {formatEuros(abonnement.tarif_mensuel)}
                </dd>
              </div>
              <div>
                <dt className="text-foreground/60">Depuis le</dt>
                <dd className="font-medium">
                  {formatDate(abonnement.date_debut)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-foreground/70">
              Vous n&apos;avez pas encore d&apos;abonnement.
            </p>
          )}
        </section>

        {/* --- Gestions en cours --- */}
        <section className="mt-8">
          <h2 className="font-bold text-brand-teal">Mes gestions en cours</h2>
          {enCours.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">
              Aucune gestion en cours.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-brand-gray/25">
              <table className="tableau-adaptatif">
                <thead className="bg-[var(--carte)]">
                  <tr>
                    <th scope="col">Salarié</th>
                    <th scope="col">Emploi</th>
                    <th scope="col">Depuis le</th>
                    <th scope="col">Dernier bulletin</th>
                    <th scope="col">{`Statut — ${libelleMois(moisCourant)}`}</th>
                    <th scope="col">
                      <span className="sr-only">Détail</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enCours.map((g) => {
                    const dernier = dernierBulletin.get(g.id);
                    // Statut du mois en cours. Un bulletin déjà en ligne
                    // pour ce mois vaut « disponible », même sans
                    // déclaration (dépôt direct par Aide & Garde), sauf si
                    // une correction a été demandée.
                    const declaration = statutDeclaration.get(g.id);
                    const statut =
                      declaration !== "modification" && dernier?.periode === moisCourant
                        ? "traitee"
                        : declaration;
                    return (
                      <tr key={g.id}>
                        <td className="cellule-pleine">
                          <Link
                            href={`/tableau-de-bord/gestions/${g.id}`}
                            className="font-bold text-brand-teal hover:underline"
                          >
                            {nomSalarie(g)}
                          </Link>
                        </td>
                        <td data-label="Emploi">{TYPES_GESTION[g.type_gestion]}</td>
                        <td data-label="Depuis le" className="tabular-nums">
                          {formatDate(g.date_debut)}
                        </td>
                        <td data-label="Dernier bulletin">
                          {dernier ? (
                            <span className="inline-flex flex-wrap items-center justify-end gap-x-2">
                              <a
                                href={`/documents/${dernier.id}/telecharger`}
                                className="font-medium text-brand-teal underline"
                                title="Télécharger"
                              >
                                ⬇ {dernier.periode ? libelleMois(dernier.periode) : "Bulletin"}
                              </a>
                              {!dernier.consulte_le && (
                                <span className="pastille-nouveau">Nouveau</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-foreground/50">—</span>
                          )}
                        </td>
                        <td data-label={`Statut — ${libelleMois(moisCourant)}`}>
                          {statut === "traitee" ? (
                            <span className="font-bold text-brand-teal">✓ Disponible</span>
                          ) : statut === "modification" ? (
                            <span className="font-bold text-brand-violet">Correction en cours</span>
                          ) : statut === "envoyee" ? (
                            <span className="text-foreground/80">Déclaration envoyée</span>
                          ) : (
                            <Link
                              href={`/tableau-de-bord/gestions/${g.id}#declaration`}
                              className="btn btn-primaire btn-sm"
                            >
                              Déclarer {libelleMois(moisCourant).split(" ")[0]}
                            </Link>
                          )}
                        </td>
                        <td className="cellule-pleine sm:text-right">
                          <Link
                            href={`/tableau-de-bord/gestions/${g.id}`}
                            className="btn btn-secondaire btn-sm w-full sm:w-auto"
                          >
                            Détail
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {terminees.length > 0 && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-foreground/70">
                Gestions terminées ({terminees.length})
              </summary>
              <ul className="mt-2 divide-y divide-brand-gray/15 rounded-lg border border-brand-gray/20">
                {terminees.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/tableau-de-bord/gestions/${g.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-brand-sky-tint/20"
                    >
                      <span>
                        {nomSalarie(g)}
                        <span className="ml-2 text-foreground/60">
                          {TYPES_GESTION[g.type_gestion]}
                        </span>
                      </span>
                      <span className="text-foreground/60">
                        {formatDate(g.date_debut)} → {formatDate(g.date_fin)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* --- Derniers documents --- */}
        <section className="mt-8">
          <h2 className="font-bold text-brand-teal">Vos 5 derniers documents</h2>
          <p className="mt-1 text-xs text-foreground/60">
            Cliquez sur un document pour le télécharger. Vos documents restent
            disponibles en permanence dans votre espace ; retrouvez-les tous
            dans le détail de chaque gestion.
          </p>
          {documents.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">
              Aucun document pour le moment.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-brand-gray/25">
              <table className="tableau-adaptatif">
                <thead className="bg-[var(--carte)]">
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Période</th>
                    <th scope="col">Document</th>
                    <th scope="col">Salarié</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => {
                    const g = gestionParId.get(d.gestion_id);
                    return (
                      <tr key={d.id}>
                        <td data-label="Type">
                          {TYPES_DOCUMENT[d.type_document] ?? d.type_document}
                        </td>
                        <td data-label="Période" className="tabular-nums">
                          {d.periode ? formatPeriode(d.periode) : "—"}
                        </td>
                        <td data-label="Document">
                          <span className="inline-flex flex-wrap items-center justify-end gap-x-2 sm:justify-start">
                            <TitreDocument doc={d} />
                            {d.storage_path && !d.consulte_le && (
                              <span className="pastille-nouveau">Nouveau</span>
                            )}
                          </span>
                        </td>
                        <td data-label="Salarié">{g ? nomSalarie(g) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
