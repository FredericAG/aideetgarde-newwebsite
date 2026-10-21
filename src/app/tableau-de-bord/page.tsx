import Link from "next/link";
import { redirect } from "next/navigation";
import { TitreDocument } from "@/components/TitreDocument";
import { NotificationsPush } from "@/components/NotificationsPush";
import { NouveauxDocuments } from "@/components/NouveauxDocuments";
import { LienTelechargement } from "@/components/LienTelechargement";
import { BoutonTelechargement } from "@/components/BoutonTelechargement";
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
export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const messageOk = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const { supabase, user, profile } = await requireUser("/tableau-de-bord");
  // L'administrateur n'a pas d'espace abonné : on l'envoie à l'administration.
  if (profile?.role === "admin") redirect("/admin");

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
  // Brique 3 : gestions créées par l'abonné, pas encore démarrées.
  const enPreparation = gestions.filter((g) => g.statut === "brouillon" || g.statut === "envoyee");
  // Places occupées dans l'abonnement : gestions en cours + envoyées.
  const placesUtilisees = gestions.filter((g) => g.statut === "en_cours" || g.statut === "envoyee").length;
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

        {messageOk && (
          <p role="status" className="mt-6 rounded-lg border border-brand-teal/40 bg-brand-teal/10 p-3 text-sm text-brand-teal">
            {messageOk}
          </p>
        )}

        {erreur && (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Impossible de charger toutes vos données pour le moment. Réessayez
            dans un instant.
          </p>
        )}

        <NouveauxDocuments
          documents={(nouveauxRes.data ?? []) as DocumentRow[]}
          salaries={Object.fromEntries(
            ((nouveauxRes.data ?? []) as DocumentRow[]).map((d) => {
              const g = gestionParId.get(d.gestion_id);
              return [d.id, g ? nomSalarie(g) : ""];
            }),
          )}
        />

        <NotificationsPush compact />

        {/* --- Abonnement --- */}
        <section className="mt-8 overflow-hidden rounded-xl border border-brand-teal/25 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-teal px-4 py-2.5 text-white">
            <h2 className="flex items-center gap-2 font-bold">
              Mon abonnement
              {abonnement && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    abonnement.statut === "actif" ? "bg-white text-brand-teal" : "bg-red-100 text-red-700"
                  }`}
                >
                  {abonnement.statut === "actif" ? "Actif" : `Résilié le ${formatDate(abonnement.date_fin)}`}
                </span>
              )}
            </h2>
            {abonnement?.statut === "actif" ? (
              <Link href="/tableau-de-bord/abonnement" className="btn btn-secondaire btn-sm">
                Gérer mon abonnement
              </Link>
            ) : (
              <Link href="/tableau-de-bord/abonnement" className="btn btn-primaire btn-sm">
                Souscrire un abonnement
              </Link>
            )}
          </div>

          {abonnement ? (
            <dl className="grid grid-cols-3 divide-x divide-brand-gray/15 text-center">
              <div className="px-2 py-3">
                <dt className="text-xs font-bold text-foreground/70">Salariés suivis</dt>
                <dd className="mt-0.5 text-base font-bold text-brand-teal tabular-nums sm:text-xl">
                  {placesUtilisees} <span className="text-sm text-foreground/60">/ {abonnement.quota_gestions}</span>
                </dd>
                <div
                  className="mx-auto mt-1.5 h-1.5 w-16 overflow-hidden rounded-full bg-brand-gray/20"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${placesUtilisees > abonnement.quota_gestions ? "bg-red-600" : "bg-brand-violet"}`}
                    style={{ width: `${Math.min(100, (placesUtilisees / Math.max(1, abonnement.quota_gestions)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="px-2 py-3">
                <dt className="text-xs font-bold text-foreground/70">Tarif mensuel</dt>
                <dd className="mt-0.5 text-base font-bold text-brand-teal tabular-nums sm:text-xl">
                  {formatEuros(abonnement.tarif_mensuel)}
                </dd>
              </div>
              <div className="px-2 py-3">
                <dt className="text-xs font-bold text-foreground/70">Depuis le</dt>
                <dd className="mt-0.5 text-base font-bold text-brand-teal tabular-nums sm:text-xl">
                  {formatDate(abonnement.date_debut)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="px-4 py-3 text-sm text-foreground/70">
              Vous n&apos;avez pas encore d&apos;abonnement : choisissez votre formule pour confier
              la paie de vos salariés à Aide &amp; Garde.
            </p>
          )}

          {abonnement?.statut === "actif" && abonnement.statut_paiement && abonnement.statut_paiement !== "a_jour" && (
            <p className="border-t border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <strong>
                {abonnement.statut_paiement === "impaye" ? "Échéance impayée" : "Prélèvement refusé"}
              </strong>{" "}
              : votre banque a refusé le dernier prélèvement.{" "}
              <Link href="/tableau-de-bord/abonnement" className="font-medium underline">
                Régler en ligne
              </Link>
            </p>
          )}
          {abonnement?.statut === "actif" && placesUtilisees >= abonnement.quota_gestions && (
            <p className="border-t border-brand-jaune bg-brand-jaune/25 px-4 py-2.5 text-sm">
              {placesUtilisees > abonnement.quota_gestions ? (
                <>
                  <strong>Vous dépassez votre abonnement</strong> : {placesUtilisees} gestions en
                  cours ou en attente de validation pour {abonnement.quota_gestions} prévues.
                  Aide &amp; Garde va vous contacter pour l&apos;ajuster ; aucune nouvelle gestion
                  ne pourra démarrer d&apos;ici là.
                </>
              ) : (
                <>
                  <strong>Abonnement complet</strong> : pour ajouter un salarié, terminez une
                  gestion ou{" "}
                  <Link href="/aide" className="text-brand-teal underline">
                    contactez-nous
                  </Link>{" "}
                  pour faire évoluer votre abonnement.
                </>
              )}
            </p>
          )}
        </section>

        {/* --- Gestions en préparation (brique 3) --- */}
        {enPreparation.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-brand-teal">Gestions en préparation</h2>
            <ul className="liste-alternee mt-3 divide-y divide-brand-gray/15 overflow-hidden rounded-xl border border-brand-gray/25">
              {enPreparation.map((g) => (
                <li key={g.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex-1">
                    <span className="font-bold text-brand-teal">{nomSalarie(g) || "Sans nom"}</span>
                    <span className="ml-2 text-foreground/60">{TYPES_GESTION[g.type_gestion]}</span>
                    <span className="mt-1 block">
                      {g.statut === "brouillon" ? (
                        g.motif_retour ? (
                          <span className="pastille-nouveau">À compléter (demande d&apos;Aide &amp; Garde)</span>
                        ) : (
                          <span className="text-foreground/70">Brouillon : pas encore envoyé</span>
                        )
                      ) : (
                        <span className="font-bold text-brand-violet">
                          Envoyée le {formatDate(g.envoyee_le)} : en attente de validation
                        </span>
                      )}
                    </span>
                  </span>
                  <Link
                    href={`/tableau-de-bord/gestions/${g.id}`}
                    className={`btn btn-sm self-start sm:self-auto ${g.statut === "brouillon" ? "btn-primaire" : "btn-secondaire"}`}
                  >
                    {g.statut === "brouillon" ? "Compléter et envoyer" : "Voir"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* --- Gestions en cours --- */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-brand-teal">Mes gestions en cours</h2>
            {abonnement?.statut === "actif" && (
              <Link href="/tableau-de-bord/gestions/nouvelle" className="btn btn-primaire btn-sm">
                + Créer une gestion
              </Link>
            )}
          </div>
          {enCours.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">
              Aucune gestion en cours.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-brand-gray/25">
              {/* Colonnes aussi sur téléphone (Salarié, Bulletin, Mois en
                  cours) : l'emploi et la date de début passent sous le nom,
                  les intitulés ne sont pas répétés à chaque gestion. */}
              <table className="w-full border-collapse text-left text-sm">
                <thead className="entete-teal">
                  <tr>
                    <th scope="col" className="px-3 py-2">Salarié</th>
                    <th scope="col" className="px-3 py-2 max-sm:hidden">Emploi</th>
                    <th scope="col" className="px-3 py-2 max-sm:hidden">Depuis le</th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sm:hidden">Bulletin</span>
                      <span className="max-sm:hidden">Dernier bulletin</span>
                    </th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sm:hidden capitalize">{libelleMois(moisCourant).split(" ")[0]}</span>
                      <span className="max-sm:hidden">{`Statut — ${libelleMois(moisCourant)}`}</span>
                    </th>
                    <th scope="col" className="px-3 py-2 max-sm:hidden">
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
                      <tr key={g.id} className="border-t border-brand-gray/20 even:bg-[#f7f7f7] max-sm:even:bg-[var(--carte)]">
                        <td className="px-2 py-2 align-middle sm:px-3 sm:py-2.5">
                          <Link
                            href={`/tableau-de-bord/gestions/${g.id}`}
                            className="font-bold text-brand-teal hover:underline"
                          >
                            {nomSalarie(g)}
                          </Link>
                          <span className="block text-xs text-foreground/60 sm:hidden">
                            {TYPES_GESTION[g.type_gestion]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-sm:hidden">{TYPES_GESTION[g.type_gestion]}</td>
                        <td className="px-3 py-2.5 tabular-nums max-sm:hidden">{formatDate(g.date_debut)}</td>
                        <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                          {dernier ? (
                            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <LienTelechargement
                                documentId={dernier.id}
                                className="font-medium text-brand-teal underline"
                                title="Télécharger"
                              >
                                ⬇{" "}
                                <span className="sm:hidden">{dernier.periode ? formatPeriode(dernier.periode) : "PDF"}</span>
                                <span className="max-sm:hidden">{dernier.periode ? libelleMois(dernier.periode) : "Bulletin"}</span>
                              </LienTelechargement>
                              {!dernier.consulte_le && (
                                <span className="pastille-nouveau">Nouveau</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                          {statut === "traitee" ? (
                            <span className="font-bold text-brand-teal">✓ Disponible</span>
                          ) : statut === "modification" ? (
                            <span className="font-bold text-brand-violet">Correction en cours</span>
                          ) : statut === "envoyee" ? (
                            <span className="text-foreground/80">
                              <span className="max-sm:hidden">Déclaration </span>envoyée
                            </span>
                          ) : statut === "close" ? (
                            <Link href={`/tableau-de-bord/gestions/${g.id}#declaration`} className="text-foreground/70 underline">
                              Close<span className="max-sm:hidden"> par Aide &amp; Garde</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/tableau-de-bord/gestions/${g.id}#declaration`}
                              className="btn btn-primaire btn-sm whitespace-nowrap"
                            >
                              Déclarer
                              <span className="max-sm:hidden"> {libelleMois(moisCourant).split(" ")[0]}</span>
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right max-sm:hidden">
                          <Link
                            href={`/tableau-de-bord/gestions/${g.id}`}
                            className="btn btn-secondaire btn-sm"
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
              <table className="tableau-documents w-full text-left text-sm">
                <thead className="entete-teal">
                  <tr>
                    <th scope="col" className="px-3 py-2">Type</th>
                    <th scope="col" className="px-3 py-2">Période</th>
                    <th scope="col" className="px-3 py-2">Document</th>
                    <th scope="col" className="px-3 py-2">Salarié</th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Télécharger</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => {
                    const g = gestionParId.get(d.gestion_id);
                    return (
                      <tr key={d.id} className="border-t border-brand-gray/20">
                        <td className="c-type px-3 py-2.5">
                          {TYPES_DOCUMENT[d.type_document] ?? d.type_document}
                        </td>
                        <td className="c-periode px-3 py-2.5 tabular-nums">
                          {d.periode ? formatPeriode(d.periode) : "—"}
                        </td>
                        <td className="c-doc px-3 py-2.5">
                          <TitreDocument doc={d} />
                          {d.storage_path && !d.consulte_le && (
                            <span className="pastille-nouveau ml-2">Nouveau</span>
                          )}
                        </td>
                        <td className="c-info px-3 py-2.5">{g ? nomSalarie(g) : ""}</td>
                        <td className="c-action px-3 py-2.5 text-right">
                          {d.storage_path && (
                            <BoutonTelechargement documentId={d.id} titre={d.titre} />
                          )}
                        </td>
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
