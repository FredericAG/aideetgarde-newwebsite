import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatEuros } from "@/lib/data";
import { configSystempay } from "@/lib/systempay";
import { BoutonTraitement } from "./BoutonTraitement";
import { VerifierConfiguration } from "./VerifierConfiguration";
import { EmailCopiable } from "@/components/EmailCopiable";

export const metadata = { title: "Abonnements — Administration Aide & Garde" };

interface LigneAbonnement {
  id: string;
  reference_client: string | null;
  prenom: string;
  nom: string;
  email: string | null;
  abonnement_statut: "actif" | "resilie";
  quota: number | null;
  tarif_mensuel: number | null;
  abonnement_debut: string | null;
  abonnement_fin: string | null;
  nb_en_cours: number;
  nb_envoyees: number;
  categorie: "actif" | "a_surveiller" | "inactif";
  quota_depasse: boolean | null;
}

type Filtre = "actifs" | "depassement" | "sans_gestion" | "resilies";

const PAR_PAGE = 50;

function un(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

interface PaiementAbonnement {
  employeur_id: string;
  mode_paiement: "manuel" | "systempay";
  statut_paiement: "a_jour" | "en_retard" | "impaye";
  prochaine_echeance: string | null;
}

interface EcheanceEnDefaut {
  id: string;
  employeur_id: string;
  date_echeance: string;
  montant: number;
  statut: string;
  tentatives: number;
  prochaine_tentative: string;
  derniere_erreur: string | null;
  profiles: { prenom: string; nom: string; reference_client: string | null } | null;
}

interface CommandeAVerifier {
  order_id: string;
  employeur_id: string;
  montant: number;
  message: string | null;
  created_at: string;
  profiles: { prenom: string; nom: string; reference_client: string | null } | null;
}

function nomCourt(p: { prenom: string; nom: string } | null): string {
  return p ? `${p.prenom} ${p.nom.toUpperCase()}`.trim() || "(sans nom)" : "(compte supprimé)";
}

/**
 * Suivi des abonnements (administration) : chiffres clés, paiements à
 * suivre (échéances refusées ou impayées, paiements à vérifier, cartes qui
 * expirent), puis la liste des abonnements avec filtres.
 */
export default async function AbonnementsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const f = un(sp.filtre);
  const filtre: Filtre =
    f === "depassement" || f === "sans_gestion" || f === "resilies" ? f : "actifs";
  const page = Math.max(1, Number(un(sp.page)) || 1);

  const { supabase } = await requireAdmin("/admin/abonnements");

  const colonnes =
    "id, reference_client, prenom, nom, email, abonnement_statut, quota, tarif_mensuel, abonnement_debut, abonnement_fin, nb_en_cours, nb_envoyees, categorie, quota_depasse";

  // Liste filtrée et paginée par la base ; chiffres clés calculés par la
  // vue admin_abonnements_resume (aucune limite de nombre de lignes).
  let requete = supabase.from("admin_comptes").select(colonnes, { count: "exact" });
  if (filtre === "resilies") requete = requete.eq("abonnement_statut", "resilie");
  else {
    requete = requete.eq("abonnement_statut", "actif");
    if (filtre === "depassement") requete = requete.eq("quota_depasse", true);
    if (filtre === "sans_gestion") requete = requete.eq("categorie", "a_surveiller");
  }
  requete =
    filtre === "resilies"
      ? requete.order("abonnement_fin", { ascending: false, nullsFirst: false })
      : filtre === "sans_gestion"
        ? requete.order("abonnement_debut", { ascending: true })
        : requete.order("nom_tri");
  requete = requete.range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);

  const debutMois = new Date();
  debutMois.setDate(1);
  const moisCourant = debutMois.toISOString().slice(0, 7) + "-01";
  const finMoisProchain = new Date(debutMois.getFullYear(), debutMois.getMonth() + 2, 0)
    .toISOString()
    .slice(0, 10);

  const [listeRes, resumeRes, defautsRes, aVerifierRes, cartesRes, encaisseRes] = await Promise.all([
    requete,
    supabase.from("admin_abonnements_resume").select("*").maybeSingle(),
    supabase
      .from("echeances")
      .select("id, employeur_id, date_echeance, montant, statut, tentatives, prochaine_tentative, derniere_erreur, profiles(prenom, nom, reference_client)")
      .or("statut.eq.impayee,and(statut.eq.a_payer,tentatives.gt.0)")
      .order("date_echeance")
      .limit(200),
    supabase
      .from("commandes")
      .select("order_id, employeur_id, montant, message, created_at, profiles(prenom, nom, reference_client)")
      .eq("statut", "a_verifier")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("abonnements")
      .select("employeur_id, carte_masquee, carte_expiration, profiles(prenom, nom, reference_client)")
      .eq("statut", "actif")
      .eq("mode_paiement", "systempay")
      .lte("carte_expiration", finMoisProchain)
      .order("carte_expiration")
      .limit(100),
    supabase.from("admin_encaissements_mois").select("*").eq("mois", moisCourant),
  ]);

  const affichees = (listeRes.data ?? []) as LigneAbonnement[];
  const total = listeRes.count ?? 0;
  const r = resumeRes.data ?? {};
  const n = (v: unknown) => Number(v ?? 0);
  const places = (a: LigneAbonnement) => a.nb_en_cours + a.nb_envoyees;

  // Paiement des abonnements affichés (une requête pour la page entière).
  const ids = affichees.map((a) => a.id);
  const paiementsRes = ids.length
    ? await supabase
        .from("abonnements")
        .select("employeur_id, mode_paiement, statut_paiement, prochaine_echeance")
        .in("employeur_id", ids)
        .eq("statut", "actif")
    : { data: [] as PaiementAbonnement[], error: null };
  const paiementPar = new Map(
    ((paiementsRes.data ?? []) as PaiementAbonnement[]).map((p) => [p.employeur_id, p]),
  );

  // Brique 5a pas encore installée : les requêtes de paiement échouent.
  const paiementsInstalles = !defautsRes.error;
  const defauts = (defautsRes.data ?? []) as unknown as EcheanceEnDefaut[];
  const aVerifier = (aVerifierRes.data ?? []) as unknown as CommandeAVerifier[];
  const cartes = (cartesRes.data ?? []) as unknown as {
    employeur_id: string;
    carte_masquee: string | null;
    carte_expiration: string;
    profiles: { prenom: string; nom: string; reference_client: string | null } | null;
  }[];
  const config = configSystempay();
  const encaisse = (encaisseRes.data ?? []).find((x) => x.mode === (config?.mode ?? "PRODUCTION"));

  const filtres: { cle: Filtre; libelle: string; nb: number; alerte?: boolean }[] = [
    { cle: "actifs", libelle: "Actifs", nb: n(r.nb_actifs) },
    { cle: "depassement", libelle: "Quota dépassé", nb: n(r.nb_depassement), alerte: true },
    { cle: "sans_gestion", libelle: "Sans gestion", nb: n(r.nb_sans_gestion), alerte: true },
    { cle: "resilies", libelle: "Résiliés", nb: n(r.nb_resilies) },
  ];
  const lien = (cle: Filtre, p?: number) =>
    `/admin/abonnements?${new URLSearchParams({
      ...(cle !== "actifs" ? { filtre: cle } : {}),
      ...(p && p > 1 ? { page: String(p) } : {}),
    }).toString()}`;

  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-6xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Abonnements</h1>

        {listeRes.error && (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Données indisponibles ({listeRes.error.message}). Le script
            supabase/brique2g_liste_comptes_admin.sql a-t-il été (re)lancé ?
          </p>
        )}

        {/* Chiffres clés */}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Abonnements actifs", String(n(r.nb_actifs))],
            ["Montant mensuel théorique", formatEuros(n(r.total_mensuel))],
            ["Places utilisées", `${n(r.places_utilisees)} / ${n(r.places_totales)}`],
            [
              config?.mode === "TEST" ? "Encaissé ce mois (test)" : "Encaissé ce mois",
              formatEuros(n(encaisse?.encaisse)),
            ],
          ].map(([dt, dd]) => (
            <div key={dt} className="carte border-l-4 border-brand-violet p-4">
              <dt className="text-sm font-bold text-foreground/85">{dt}</dt>
              <dd className="mt-1 text-2xl font-bold text-brand-teal">{dd}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-foreground/60">
          Montant théorique : somme des tarifs des abonnements actifs. Encaissé :
          paiements acceptés par Systempay depuis le 1er du mois (abonnements
          souscrits sur le nouveau site).
        </p>

        {/* Paiements à suivre */}
        <section className="mt-6 rounded-xl border-2 border-brand-violet/40 bg-white p-4 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold text-brand-violet">
              Paiements à suivre
              {config?.mode === "TEST" && (
                <span className="ml-2 rounded-full bg-brand-violet px-2 py-0.5 text-xs text-white">mode test</span>
              )}
            </h2>
            {paiementsInstalles && <BoutonTraitement />}
          </div>
          <div className="mt-3">
            <VerifierConfiguration />
          </div>
          {!paiementsInstalles ? (
            <p className="mt-2 text-foreground/70">
              Exécutez le script supabase/brique5a_paiements.sql pour activer le suivi des paiements.
            </p>
          ) : defauts.length + aVerifier.length + cartes.length === 0 ? (
            <p className="mt-2 text-foreground/70">
              Rien à signaler : aucune échéance refusée, aucun paiement à vérifier, aucune carte
              enregistrée n&apos;expire d&apos;ici la fin du mois prochain. Les échéances sont
              encaissées automatiquement chaque matin.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {defauts.length > 0 && (
                <div>
                  <h3 className="font-bold text-red-700">Échéances refusées ({defauts.length})</h3>
                  <ul className="liste-alternee mt-2 divide-y divide-brand-gray/15 overflow-hidden rounded-lg border border-brand-gray/25">
                    {defauts.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                        <Link href={`/admin/comptes/${e.employeur_id}`} className="min-w-48 font-bold text-brand-teal">
                          {nomCourt(e.profiles)}{" "}
                          <span className="font-mono text-xs font-normal text-foreground/60">{e.profiles?.reference_client}</span>
                        </Link>
                        <span className="tabular-nums">
                          {formatDate(e.date_echeance)} · {formatEuros(Number(e.montant))}
                        </span>
                        <span className={e.statut === "impayee" ? "font-bold text-red-700" : "text-red-700"}>
                          {e.statut === "impayee"
                            ? `Impayée après ${e.tentatives} refus`
                            : `${e.tentatives} refus, nouvel essai le ${formatDate(e.prochaine_tentative)}`}
                        </span>
                        {e.derniere_erreur && (
                          <span className="font-mono text-xs text-foreground/50">{e.derniere_erreur}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aVerifier.length > 0 && (
                <div>
                  <h3 className="font-bold text-red-700">Paiements à vérifier ({aVerifier.length})</h3>
                  <ul className="liste-alternee mt-2 divide-y divide-brand-gray/15 overflow-hidden rounded-lg border border-brand-gray/25">
                    {aVerifier.map((c) => (
                      <li key={c.order_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                        <Link href={`/admin/comptes/${c.employeur_id}`} className="min-w-48 font-bold text-brand-teal">
                          {nomCourt(c.profiles)}
                        </Link>
                        <span className="tabular-nums">
                          {formatDate(c.created_at)} · {formatEuros(Number(c.montant))}
                        </span>
                        <span>{c.message}</span>
                        <span className="font-mono text-xs text-foreground/50">{c.order_id}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-foreground/60">
                    Remboursement éventuel depuis le Back Office Systempay (recherche par la référence).
                  </p>
                </div>
              )}
              {cartes.length > 0 && (
                <div>
                  <h3 className="font-bold text-brand-black">Cartes qui expirent bientôt ({cartes.length})</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {cartes.map((c) => (
                      <li key={c.employeur_id}>
                        <Link
                          href={`/admin/comptes/${c.employeur_id}`}
                          className="inline-block rounded-full border border-brand-gray/30 px-3 py-1 text-xs"
                        >
                          {nomCourt(c.profiles)} · fin {formatDate(c.carte_expiration).slice(3)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Filtres */}
        <nav aria-label="Filtres" className="mt-6 flex flex-wrap gap-2">
          {filtres.map((x) => (
            <Link
              key={x.cle}
              href={lien(x.cle)}
              scroll={false}
              aria-current={filtre === x.cle ? "page" : undefined}
              className={`btn btn-sm ${
                filtre === x.cle
                  ? "btn-primaire"
                  : x.alerte && x.nb > 0
                    ? "btn-secondaire bg-brand-jaune/40"
                    : "btn-secondaire"
              }`}
            >
              {x.libelle} ({x.nb})
            </Link>
          ))}
        </nav>

        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-gray/25">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="entete-liste">
              <tr>
                <th className="px-3 py-2">Réf.</th>
                <th className="px-3 py-2">Abonné</th>
                <th className="px-3 py-2">{filtre === "resilies" ? "Période" : "Depuis le"}</th>
                <th className="px-3 py-2">Tarif</th>
                <th className="px-3 py-2">Places</th>
                <th className="px-3 py-2">À vérifier</th>
                <th className="px-3 py-2">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {affichees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-foreground/60">
                    Aucun abonnement dans cette catégorie.
                  </td>
                </tr>
              )}
              {affichees.map((a) => {
                const p = places(a);
                const alerte =
                  a.abonnement_statut === "resilie"
                    ? ""
                    : a.quota_depasse
                      ? "Quota dépassé"
                      : a.categorie === "a_surveiller"
                        ? "Payé sans gestion"
                        : "";
                return (
                  <tr key={a.id} className="relative border-t border-brand-gray/20 even:bg-[#f7f7f7] hover:bg-brand-sky-tint/25">
                    <td className="px-3 py-2.5 font-mono text-xs text-foreground/60">{a.reference_client}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/comptes/${a.id}`}
                        className="font-bold text-brand-teal after:absolute after:inset-0 after:content-['']"
                      >
                        {`${a.prenom} ${a.nom.toUpperCase()}`.trim() || "(sans nom)"}
                      </Link>
                      {a.email && (
                        <span className="block text-xs text-foreground/60">
                          <EmailCopiable email={a.email} />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {a.abonnement_statut === "resilie"
                        ? `${formatDate(a.abonnement_debut)} → ${formatDate(a.abonnement_fin)}`
                        : formatDate(a.abonnement_debut)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {a.tarif_mensuel != null ? `${formatEuros(Number(a.tarif_mensuel))} / mois` : "—"}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {p} / {a.quota ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {alerte ? (
                        <span className="rounded-full bg-brand-jaune px-2 py-0.5 text-xs font-bold text-brand-black">
                          {alerte}
                        </span>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <CellulePaiement p={paiementPar.get(a.id)} resilie={a.abonnement_statut === "resilie"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > PAR_PAGE && (
          <nav aria-label="Pages" className="mt-3 flex items-center justify-between text-sm">
            <span className="text-foreground/60">
              {(page - 1) * PAR_PAGE + 1}–{Math.min(page * PAR_PAGE, total)} sur {total}
            </span>
            <span className="flex gap-2">
              {page > 1 && (
                <Link href={lien(filtre, page - 1)} className="btn btn-secondaire btn-sm">
                  ← Précédents
                </Link>
              )}
              {page * PAR_PAGE < total && (
                <Link href={lien(filtre, page + 1)} className="btn btn-secondaire btn-sm">
                  Suivants →
                </Link>
              )}
            </span>
          </nav>
        )}
      </div>
    </div>
  );
}

function CellulePaiement({ p, resilie }: { p: PaiementAbonnement | undefined; resilie: boolean }) {
  if (resilie) return <span className="text-foreground/40">—</span>;
  if (!p || p.mode_paiement !== "systempay") {
    return <span className="text-foreground/50" title="Abonnement saisi par l'administration, non prélevé par le site">Hors site</span>;
  }
  if (p.statut_paiement === "impaye") return <span className="font-bold text-red-700">Impayé</span>;
  if (p.statut_paiement === "en_retard") return <span className="font-medium text-red-700">Refusé, nouvel essai</span>;
  return (
    <span className="text-brand-teal">
      À jour
      <span className="block text-foreground/50">prochain {formatDate(p.prochaine_echeance)}</span>
    </span>
  );
}
