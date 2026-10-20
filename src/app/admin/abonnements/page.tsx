import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatEuros } from "@/lib/data";

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

/**
 * Suivi des abonnements (administration). Aujourd'hui : abonnements actifs,
 * quota dépassé, abonnements sans gestion, résiliés, et le montant mensuel
 * théorique. Les paiements refusés et les relances s'ajouteront au
 * branchement de Systempay (briques 5 et 6).
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

  const [listeRes, resumeRes] = await Promise.all([
    requete,
    supabase.from("admin_abonnements_resume").select("*").maybeSingle(),
  ]);

  const affichees = (listeRes.data ?? []) as LigneAbonnement[];
  const total = listeRes.count ?? 0;
  const r = resumeRes.data ?? {};
  const n = (v: unknown) => Number(v ?? 0);
  const places = (a: LigneAbonnement) => a.nb_en_cours + a.nb_envoyees;

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
            ["À vérifier", String(n(r.nb_depassement) + n(r.nb_sans_gestion))],
          ].map(([dt, dd]) => (
            <div key={dt} className="carte p-4">
              <dt className="text-xs text-foreground/60">{dt}</dt>
              <dd className="mt-1 text-xl font-bold text-brand-teal">{dd}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-foreground/60">
          Montant théorique : somme des tarifs des abonnements actifs, avant les
          paiements réellement encaissés (disponibles avec le branchement de
          Systempay).
        </p>

        {/* Paiements : à venir avec Systempay */}
        <section className="mt-6 rounded-xl border-2 border-dashed border-brand-gray/40 p-4 text-sm">
          <h2 className="font-bold text-brand-violet">Paiements refusés et relances</h2>
          <p className="mt-1 text-foreground/70">
            Arrive avec le branchement de Systempay (briques 5 et 6) : échéances
            refusées par la banque, relances envoyées à l&apos;abonné, cartes
            arrivant à expiration, comptes à suspendre, et contrôle quotidien
            que chaque prélèvement a bien été enregistré.
          </p>
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
            <thead className="bg-[var(--carte)] text-brand-teal">
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
                      <span className="block text-xs text-foreground/60">{a.email}</span>
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
                    <td className="px-3 py-2.5 text-xs text-foreground/50">à venir</td>
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
