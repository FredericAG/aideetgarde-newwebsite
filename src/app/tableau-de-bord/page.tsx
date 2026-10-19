import Link from "next/link";
import { InfosDocument } from "@/components/TitreDocument";
import { NotificationsPush } from "@/components/NotificationsPush";
import { requireUser } from "@/lib/auth";
import {
  TYPES_GESTION,
  formatDate,
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

  const [abosRes, gestionsRes, docsRes, declsRes] = await Promise.all([
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
      .select("id, gestion_id, type_document, periode, titre, storage_path, created_at")
      .eq("employeur_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("declarations_mensuelles")
      .select("gestion_id, statut")
      .eq("employeur_id", user.id)
      .eq("periode", moisCourant),
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

        <NotificationsPush compact />

        {/* --- Abonnement --- */}
        <section className="mt-8 rounded-lg border border-brand-teal/20 p-5">
          <h2 className="font-bold text-brand-teal">Mon abonnement</h2>
          {abonnement ? (
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
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
            <ul className="mt-3 divide-y divide-brand-gray/15 rounded-lg border border-brand-gray/20">
              {enCours.map((g) => {
                const statut = statutDeclaration.get(g.id);
                return (
                  <li key={g.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={`/tableau-de-bord/gestions/${g.id}`}
                      className="flex-1 hover:underline"
                    >
                      <span className="font-medium">{nomSalarie(g)}</span>
                      <span className="ml-2 text-foreground/60">
                        {TYPES_GESTION[g.type_gestion]} · depuis le {formatDate(g.date_debut)}
                      </span>
                    </Link>
                    {statut === "traitee" ? (
                      <span className="text-brand-teal">
                        Bulletin de {libelleMois(moisCourant)} établi
                      </span>
                    ) : statut === "modification" ? (
                      <span className="text-foreground/70">
                        {libelleMois(moisCourant)} : modification demandée
                      </span>
                    ) : statut === "envoyee" ? (
                      <span className="text-foreground/70">
                        {libelleMois(moisCourant)} : déclaration envoyée
                      </span>
                    ) : (
                      <Link
                        href={`/tableau-de-bord/gestions/${g.id}#declaration`}
                        className="rounded-md bg-brand-violet px-3 py-2 text-center font-semibold text-white"
                      >
                        Déclarer {libelleMois(moisCourant)}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
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
            <ul className="mt-3 divide-y divide-brand-gray/15 rounded-lg border border-brand-gray/20">
              {documents.map((d) => {
                const g = gestionParId.get(d.gestion_id);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <InfosDocument doc={d} />
                    <span className="shrink-0 text-foreground/60">
                      {g ? nomSalarie(g) : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
