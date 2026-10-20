import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/data";
import {
  DetailActions,
  type AvenantATraiter,
  type DeclarationATraiter,
  type GestionAValider,
} from "./DetailActions";
import { RechercheComptes } from "./RechercheComptes";

/** Une ligne de la vue `admin_comptes` (supabase/brique2g_liste_comptes_admin.sql). */
interface LigneCompte {
  id: string;
  reference_client: string | null;
  prenom: string;
  nom: string;
  email: string | null;
  ville: string;
  code_postal: string;
  created_at: string;
  abonnement_statut: "actif" | "resilie" | null;
  quota: number | null;
  nb_en_cours: number;
  nb_envoyees: number;
  nb_brouillons: number;
  nb_terminees: number;
  salaries: string;
  nb_actions: number;
  categorie: "actif" | "a_surveiller" | "inactif";
  nb_homonymes: number;
}

type Vue = "actifs" | "surveiller" | "actions" | "inactifs";
type Tri = "nom" | "inscription" | "abonnement" | "gestions" | "actions";

const PAR_PAGE = 50;

const COLONNES_TRI: Record<Tri, string> = {
  nom: "nom_tri",
  inscription: "created_at",
  abonnement: "abonnement_statut",
  gestions: "nb_en_cours",
  actions: "nb_actions",
};

/** Même simplification que la fonction SQL texte_recherche (accents, majuscules). */
function simplifier(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "o")
    .replace(/æ/g, "a")
    .replace(/[%_\\(),"]/g, " ");
}

function un(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Espace d'administration : liste des comptes pensée pour des milliers
 * d'abonnés. Recherche, tri, filtres et pagination sont faits par la base
 * (vue `admin_comptes`) : seules les 50 lignes affichées sont chargées.
 *
 * Onglets :
 * - Clients actifs : au moins une gestion en cours ou à valider ;
 * - À surveiller : abonnement actif mais aucune gestion en cours ni en
 *   attente (abonnement payé pour rien ? remboursement à prévoir ?) ;
 * - Avec actions : quelque chose attend l'administrateur ;
 * - Inactifs : ni gestion ni abonnement actif, affichés seulement à la
 *   demande.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const recherche = (un(sp.q) ?? "").trim();
  const vueDemandee = un(sp.vue);
  const vue: Vue =
    vueDemandee === "surveiller" || vueDemandee === "actions" || vueDemandee === "inactifs"
      ? vueDemandee
      : "actifs";
  const triDemande = un(sp.tri);
  const tri: Tri = triDemande && triDemande in COLONNES_TRI ? (triDemande as Tri) : "actions";
  // Par défaut : actions en premier (ordre décroissant), sinon ordre croissant.
  const ordre = un(sp.ordre) === "asc" || un(sp.ordre) === "desc" ? un(sp.ordre)! : tri === "actions" || tri === "inscription" ? "desc" : "asc";
  const page = Math.max(1, Number(un(sp.page)) || 1);

  const { supabase } = await requireAdmin("/admin");

  let requete = supabase
    .from("admin_comptes")
    .select(
      "id, reference_client, prenom, nom, email, ville, code_postal, created_at, abonnement_statut, quota, nb_en_cours, nb_envoyees, nb_brouillons, nb_terminees, salaries, nb_actions, categorie, nb_homonymes",
      { count: "exact" },
    );
  if (recherche) {
    // Chaque mot doit apparaître (ex. « durand helene » ou « durand 75011 »).
    for (const mot of simplifier(recherche).split(/\s+/).filter(Boolean).slice(0, 5)) {
      requete = requete.like("recherche", `%${mot}%`);
    }
  } else if (vue === "actions") {
    requete = requete.gt("nb_actions", 0);
  } else {
    requete = requete.eq(
      "categorie",
      vue === "surveiller" ? "a_surveiller" : vue === "inactifs" ? "inactif" : "actif",
    );
  }
  requete = requete
    .order(COLONNES_TRI[tri], { ascending: ordre === "asc", nullsFirst: false })
    .order("nom_tri", { ascending: true })
    .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);

  const [listeRes, resumeRes, avecActionsRes, declsRes, aValiderRes, avenantsRes] = await Promise.all([
    requete,
    supabase.from("admin_comptes_resume").select("categorie, nb_comptes, nb_actions"),
    supabase.from("admin_comptes").select("id", { count: "exact", head: true }).gt("nb_actions", 0),
    // Détail des actions, la plus ancienne en premier.
    supabase
      .from("declarations_mensuelles")
      .select(
        "id, gestion_id, periode, heures, commentaire, statut, motif_modification, envoyee_le, employeur_id, gestion:gestions(reference, prenom_salarie, nom_salarie), employeur:profiles(prenom, nom)",
      )
      .in("statut", ["envoyee", "modification"])
      .order("envoyee_le", { ascending: true })
      .limit(200),
    supabase
      .from("gestions")
      .select("id, reference, prenom_salarie, nom_salarie, type_gestion, envoyee_le, employeur_id, employeur:profiles(prenom, nom)")
      .eq("statut", "envoyee")
      .order("envoyee_le", { ascending: true })
      .limit(200),
    supabase
      .from("demandes_avenant")
      .select(
        "id, objets, date_effet, description, created_at, employeur_id, gestion_id, gestion:gestions(reference, prenom_salarie, nom_salarie), employeur:profiles(prenom, nom)",
      )
      .eq("statut", "envoyee")
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  const lignes = (listeRes.data ?? []) as LigneCompte[];
  const total = listeRes.count ?? 0;
  const resume = new Map(
    (resumeRes.data ?? []).map((r) => [
      r.categorie as string,
      { comptes: Number(r.nb_comptes), actions: Number(r.nb_actions) },
    ]),
  );
  const totalActions = [...resume.values()].reduce((s, r) => s + r.actions, 0);
  const comptesAvecActions = avecActionsRes.count ?? 0;
  const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const avenants = (avenantsRes.data ?? []) as unknown as AvenantATraiter[];
  const aValider = (aValiderRes.data ?? []) as unknown as GestionAValider[];
  const aTraiter = (declsRes.data ?? []) as unknown as DeclarationATraiter[];

  // Adresse de la page avec des paramètres modifiés (onglet, tri, page).
  const lien = (modif: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q: recherche || undefined,
      vue: vue === "actifs" ? undefined : vue,
      tri: tri === "actions" ? undefined : tri,
      ordre: un(sp.ordre),
      page: undefined,
      ...modif,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  const enteteTri = (cle: Tri, libelle: string) => {
    const actif = tri === cle;
    const prochainOrdre = actif ? (ordre === "asc" ? "desc" : "asc") : cle === "actions" || cle === "inscription" ? "desc" : "asc";
    return (
      <Link
        href={lien({ tri: cle, ordre: prochainOrdre })}
        scroll={false}
        className={`inline-flex items-center gap-1 whitespace-nowrap hover:underline ${actif ? "text-brand-violet" : ""}`}
        title={`Trier par ${libelle.toLowerCase()}`}
      >
        {libelle}
        <span aria-hidden="true" className="text-xs">
          {actif ? (ordre === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    );
  };

  const onglets: { vue: Vue; libelle: string; nb: number; style: string }[] = [
    { vue: "actifs", libelle: "Clients actifs", nb: resume.get("actif")?.comptes ?? 0, style: "" },
    {
      vue: "surveiller",
      libelle: "À surveiller : abonnement sans gestion",
      nb: resume.get("a_surveiller")?.comptes ?? 0,
      style: "surveiller",
    },
    { vue: "actions", libelle: "Avec actions à effectuer", nb: comptesAvecActions, style: "actions" },
  ];

  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-6xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Administration</h1>

        {listeRes.error && (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Liste des comptes indisponible ({listeRes.error.message}). Le script
            supabase/brique2g_liste_comptes_admin.sql a-t-il bien été exécuté ?
          </p>
        )}

        {/* Somme des actions de toutes les lignes */}
        <section
          aria-label="Actions à effectuer"
          className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 text-sm ${
            totalActions ? "border-2 border-brand-violet bg-brand-violet/5" : "border border-brand-gray/20"
          }`}
        >
          <h2 className="font-bold text-brand-violet">
            {totalActions
              ? `${totalActions} action(s) à effectuer, sur ${comptesAvecActions} compte(s)`
              : "Aucune action à effectuer"}
          </h2>
          {totalActions > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link href={lien({ vue: "actions", q: undefined })} className="btn btn-primaire btn-sm">
                Voir les comptes concernés
              </Link>
              <a href="#detail-actions" className="btn btn-secondaire btn-sm">
                Détail par type
              </a>
            </div>
          )}
        </section>

        {(resume.get("a_surveiller")?.comptes ?? 0) > 0 && vue !== "surveiller" && !recherche && (
          <p className="mt-3 rounded-lg border-2 border-brand-jaune bg-brand-jaune/25 p-3 text-sm">
            <strong>{resume.get("a_surveiller")?.comptes} compte(s) paient un abonnement sans gestion en
            cours ni demande en attente</strong> : à vérifier (abonnement à suspendre ou à rembourser ?).{" "}
            <Link href={lien({ vue: "surveiller", tri: "inscription", ordre: "asc" })} className="font-bold text-brand-violet underline">
              Les afficher
            </Link>
          </p>
        )}

        {/* Recherche et onglets */}
        <div className="mt-6">
          <RechercheComptes />
        </div>

        {recherche ? (
          <p className="mt-3 text-sm text-foreground/70">
            {total} compte(s) trouvé(s) pour « {recherche} », dans tous les comptes (actifs, à
            surveiller et inactifs).
          </p>
        ) : (
          <nav aria-label="Catégories de comptes" className="mt-4 flex flex-wrap items-center gap-2">
            {onglets.map((o) => (
              <Link
                key={o.vue}
                href={lien({ vue: o.vue === "actifs" ? undefined : o.vue })}
                scroll={false}
                aria-current={vue === o.vue ? "page" : undefined}
                className={`btn btn-sm ${
                  vue === o.vue
                    ? "btn-primaire"
                    : o.style === "surveiller" && o.nb > 0
                      ? "btn-secondaire bg-brand-jaune/40"
                      : "btn-secondaire"
                }`}
              >
                {o.libelle} ({o.nb})
              </Link>
            ))}
            <Link
              href={lien({ vue: "inactifs" })}
              scroll={false}
              aria-current={vue === "inactifs" ? "page" : undefined}
              className={`ml-auto text-sm underline ${vue === "inactifs" ? "font-bold text-brand-violet" : "text-foreground/60"}`}
            >
              Voir les comptes inactifs ({resume.get("inactif")?.comptes ?? 0})
            </Link>
          </nav>
        )}

        {vue === "inactifs" && !recherche && (
          <p className="mt-3 text-xs text-foreground/60">
            Comptes sans gestion en cours ni en attente, et sans abonnement actif (anciens
            clients, ou inscrits qui n&apos;ont pas encore souscrit).
          </p>
        )}
        {vue === "surveiller" && !recherche && (
          <p className="mt-3 text-xs text-foreground/60">
            Abonnement actif, mais aucune gestion en cours ni en attente de validation. Un
            brouillon éventuel est indiqué. Les plus anciens inscrits d&apos;abord.
          </p>
        )}

        {/* Liste des comptes */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-gray/25">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead className="bg-[var(--carte)] text-brand-teal">
              <tr>
                <th className="px-3 py-2">Réf.</th>
                <th className="px-3 py-2">{enteteTri("nom", "Employeur")}</th>
                <th className="px-3 py-2">{enteteTri("inscription", "Inscrit le")}</th>
                <th className="px-3 py-2">{enteteTri("abonnement", "Abonnement")}</th>
                <th className="px-3 py-2">{enteteTri("gestions", "Gestions")}</th>
                <th className="px-3 py-2">Salariés</th>
                <th className="px-3 py-2 text-right">{enteteTri("actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-foreground/60">
                    Aucun compte.
                  </td>
                </tr>
              )}
              {lignes.map((c) => {
                const nomAffiche = `${c.prenom} ${c.nom.toUpperCase()}`.trim() || "(sans nom)";
                return (
                  <tr
                    key={c.id}
                    className={`relative border-t border-brand-gray/20 even:bg-[#f7f7f7] hover:bg-brand-sky-tint/25 ${
                      c.categorie === "a_surveiller" ? "bg-brand-jaune/15" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 align-top font-mono text-xs text-foreground/60">
                      {c.reference_client}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {/* Lien étiré sur toute la ligne : un clic n'importe où ouvre la fiche. */}
                      <Link
                        href={`/admin/comptes/${c.id}`}
                        className="font-bold text-brand-teal after:absolute after:inset-0 after:content-['']"
                      >
                        {nomAffiche}
                      </Link>
                      {c.nb_homonymes > 1 && (
                        <span
                          className="ml-2 rounded-full bg-brand-jaune px-2 py-0.5 text-[11px] font-bold text-brand-black"
                          title={`${c.nb_homonymes} comptes portent ce nom : vérifiez la référence, l'email, la ville ou les salariés.`}
                        >
                          Homonyme ×{c.nb_homonymes}
                        </span>
                      )}
                      <span className="block text-xs text-foreground/60">
                        {[c.email, [c.code_postal, c.ville].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top tabular-nums">{formatDate(c.created_at)}</td>
                    <td className="px-3 py-2.5 align-top">
                      {c.abonnement_statut === "actif" ? (
                        <span className="font-medium text-brand-teal">Actif</span>
                      ) : c.abonnement_statut === "resilie" ? (
                        <span className="text-foreground/60">Résilié</span>
                      ) : (
                        <span className="text-foreground/50">Aucun</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {c.categorie === "a_surveiller" ? (
                        <span className="font-bold text-brand-black">
                          0 / {c.quota} — abonnement sans gestion
                        </span>
                      ) : (
                        <span className="tabular-nums">
                          {c.nb_en_cours}
                          {c.quota ? ` / ${c.quota}` : ""} en cours
                        </span>
                      )}
                      <span className="block text-xs text-foreground/60">
                        {[
                          c.nb_envoyees ? `${c.nb_envoyees} à valider` : "",
                          c.nb_brouillons ? `${c.nb_brouillons} brouillon(s)` : "",
                          c.nb_terminees ? `${c.nb_terminees} terminée(s)` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td className="max-w-[16rem] px-3 py-2.5 align-top text-xs text-foreground/80">
                      <span className="line-clamp-2" title={c.salaries}>
                        {c.salaries || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">
                      {c.nb_actions > 0 ? (
                        <Link
                          href={`/admin/comptes/${c.id}`}
                          className="btn btn-primaire btn-sm relative z-10 whitespace-nowrap"
                        >
                          {c.nb_actions} action{c.nb_actions > 1 ? "s" : ""}
                        </Link>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAR_PAGE && (
          <nav aria-label="Pages" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-foreground/60">
              {(page - 1) * PAR_PAGE + 1}–{Math.min(page * PAR_PAGE, total)} sur {total}
            </span>
            <span className="flex gap-2">
              {page > 1 && (
                <Link href={lien({ page: String(page - 1) })} className="btn btn-secondaire btn-sm">
                  ← Précédents
                </Link>
              )}
              {page < nbPages && (
                <Link href={lien({ page: String(page + 1) })} className="btn btn-secondaire btn-sm">
                  Suivants →
                </Link>
              )}
            </span>
          </nav>
        )}

        {/* Détail des actions par type */}
        <details id="detail-actions" className="mt-10 scroll-mt-4" open={totalActions > 0 && totalActions <= 10}>
          <summary className="font-bold text-brand-violet">
            Détail des actions par type ({aValider.length + avenants.length + aTraiter.length})
          </summary>
          <DetailActions avenants={avenants} aValider={aValider} aTraiter={aTraiter} />
        </details>
      </div>
    </div>
  );
}
