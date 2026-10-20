import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  OBJETS_AVENANT,
  TYPES_GESTION,
  formatDate,
  formatHeures,
  libelleMois,
  type ObjetAvenant,
} from "@/lib/data";

interface DeclarationATraiter {
  id: string;
  periode: string;
  heures: number | null;
  commentaire: string;
  envoyee_le: string;
  employeur_id: string;
  gestion_id: string;
  statut: "envoyee" | "modification";
  motif_modification: string | null;
  gestion: { reference: string; prenom_salarie: string; nom_salarie: string } | null;
  employeur: { prenom: string; nom: string } | null;
}

interface GestionAValider {
  id: string;
  reference: string;
  prenom_salarie: string;
  nom_salarie: string;
  type_gestion: keyof typeof TYPES_GESTION;
  envoyee_le: string;
  employeur_id: string;
  employeur: { prenom: string; nom: string } | null;
}

interface AvenantATraiter {
  id: string;
  objets: ObjetAvenant[];
  date_effet: string | null;
  description: string;
  created_at: string;
  employeur_id: string;
  gestion_id: string;
  gestion: { reference: string; prenom_salarie: string; nom_salarie: string } | null;
  employeur: { prenom: string; nom: string } | null;
}

interface CompteRow {
  id: string;
  email: string | null;
  role: string;
  prenom: string;
  nom: string;
  created_at: string;
}

/**
 * Back-office, brique 1-2 : liste des comptes (lecture seule) avec, pour
 * chacun, l'état de son abonnement. On y entre pour créer / modifier les
 * données de test d'un compte (voir la fiche d'un compte).
 */
export default async function AdminPage() {
  const { supabase } = await requireAdmin("/admin");

  const [comptesRes, abosRes, gestionsRes, declsRes, aValiderRes, avenantsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role, prenom, nom, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("abonnements")
      .select("employeur_id, quota_gestions")
      .eq("statut", "actif"),
    supabase.from("gestions").select("employeur_id").in("statut", ["en_cours", "envoyee"]),
    // Déclarations envoyées par les abonnés, en attente de bulletin
    // (la plus ancienne en premier : c'est elle qui attend depuis le plus
    // longtemps).
    supabase
      .from("declarations_mensuelles")
      .select(
        "id, gestion_id, periode, heures, commentaire, statut, motif_modification, envoyee_le, employeur_id, gestion:gestions(reference, prenom_salarie, nom_salarie), employeur:profiles(prenom, nom)",
      )
      .in("statut", ["envoyee", "modification"])
      .order("envoyee_le", { ascending: true })
      .limit(200),
    // Brique 3 : gestions envoyées par les abonnés, à valider.
    supabase
      .from("gestions")
      .select("id, reference, prenom_salarie, nom_salarie, type_gestion, envoyee_le, employeur_id, employeur:profiles(prenom, nom)")
      .eq("statut", "envoyee")
      .order("envoyee_le", { ascending: true })
      .limit(200),
    // Brique 3b : demandes d'avenant en attente.
    supabase
      .from("demandes_avenant")
      .select(
        "id, objets, date_effet, description, created_at, employeur_id, gestion_id, gestion:gestions(reference, prenom_salarie, nom_salarie), employeur:profiles(prenom, nom)",
      )
      .eq("statut", "envoyee")
      .order("created_at", { ascending: true })
      .limit(200),
  ]);
  const avenants = (avenantsRes.data ?? []) as unknown as AvenantATraiter[];
  const aValider = (aValiderRes.data ?? []) as unknown as GestionAValider[];
  const aTraiter = (declsRes.data ?? []) as unknown as DeclarationATraiter[];
  const totalActions = aValider.length + avenants.length + aTraiter.length;

  const comptes = (comptesRes.data ?? []) as CompteRow[];
  const quotaParCompte = new Map(
    (abosRes.data ?? []).map((a) => [a.employeur_id as string, a.quota_gestions as number]),
  );
  const enCoursParCompte = new Map<string, number>();
  for (const g of gestionsRes.data ?? []) {
    const id = g.employeur_id as string;
    enCoursParCompte.set(id, (enCoursParCompte.get(id) ?? 0) + 1);
  }

  const erreur = comptesRes.error || abosRes.error || gestionsRes.error;

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Administration
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {comptes.length} compte(s). Cliquez sur un compte pour gérer son
          abonnement, ses gestions et ses documents.
        </p>

        {erreur && (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Erreur de lecture : {erreur.message}. Le script supabase/brique2.sql
            a-t-il bien été exécuté ?
          </p>
        )}

        {/* Résumé des actions qui attendent l'administrateur */}
        <section
          aria-label="Actions à effectuer"
          className={`mt-6 rounded-xl p-4 text-sm ${
            totalActions
              ? "border-2 border-brand-violet bg-brand-violet/5"
              : "border border-brand-gray/20"
          }`}
        >
          <h2 className="font-bold text-brand-violet">
            {totalActions ? `Actions à effectuer (${totalActions})` : "Aucune action à effectuer"}
          </h2>
          {totalActions > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {aValider.length > 0 && (
                <li>
                  <a href="#gestions-a-valider" className="btn btn-primaire btn-sm">
                    {aValider.length} gestion(s) à valider
                  </a>
                </li>
              )}
              {avenants.length > 0 && (
                <li>
                  <a href="#avenants" className="btn btn-primaire btn-sm">
                    {avenants.length} demande(s) d&apos;avenant
                  </a>
                </li>
              )}
              {aTraiter.length > 0 && (
                <li>
                  <a href="#declarations" className="btn btn-primaire btn-sm">
                    {aTraiter.length} déclaration(s) à traiter
                  </a>
                </li>
              )}
            </ul>
          )}
        </section>

        {avenants.length > 0 && (
          <section id="avenants" className="mt-8 scroll-mt-4">
            <h2 className="font-bold text-brand-violet">Demandes d&apos;avenant ({avenants.length})</h2>
            <p className="mt-1 text-xs text-foreground/60">
              Changements signalés par les abonnés sur une gestion en cours. Une
              demande se clôt d&apos;elle-même au dépôt d&apos;un document
              « Avenant » pour la gestion.
            </p>
            <ul className="mt-3 divide-y divide-brand-gray/15 rounded-lg border border-brand-violet/30">
              {avenants.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-start sm:gap-4">
                  <span className="w-20 shrink-0 font-mono text-xs text-foreground/60">{a.gestion?.reference}</span>
                  <span className="flex-1">
                    <span className="font-medium">
                      {`${a.employeur?.prenom ?? ""} ${a.employeur?.nom ?? ""}`.trim() || "(sans nom)"}
                    </span>
                    {" → "}
                    {`${a.gestion?.prenom_salarie ?? ""} ${a.gestion?.nom_salarie ?? ""}`.trim()}
                    <span className="block text-foreground/70">
                      {a.objets.map((o) => OBJETS_AVENANT[o] ?? o).join(" · ")}
                      {a.date_effet ? ` — à partir du ${formatDate(a.date_effet)}` : ""}
                    </span>
                    <span className="block text-foreground/70">« {a.description} »</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-start gap-1 text-xs text-foreground/60 sm:items-end">
                    demandée le {formatDate(a.created_at)}
                    <Link href={`/admin/comptes/${a.employeur_id}#gestion-${a.gestion_id}`} className="btn btn-primaire btn-sm">
                      Traiter
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {aValider.length > 0 && (
          <section id="gestions-a-valider" className="mt-8 scroll-mt-4">
            <h2 className="font-bold text-brand-violet">Gestions à valider ({aValider.length})</h2>
            <p className="mt-1 text-xs text-foreground/60">
              Créées et envoyées par les abonnés. Vérifiez les informations du
              contrat, puis validez ou renvoyez à l&apos;abonné.
            </p>
            <ul className="mt-3 divide-y divide-brand-gray/15 rounded-lg border border-brand-violet/30">
              {aValider.map((g) => (
                <li key={g.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-20 shrink-0 font-mono text-xs text-foreground/60">{g.reference}</span>
                  <span className="flex-1">
                    <span className="font-medium">
                      {`${g.employeur?.prenom ?? ""} ${g.employeur?.nom ?? ""}`.trim() || "(sans nom)"}
                    </span>
                    {" → "}
                    {`${g.prenom_salarie} ${g.nom_salarie}`.trim()}
                    <span className="ml-2 text-foreground/60">{TYPES_GESTION[g.type_gestion]}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-start gap-1 text-xs text-foreground/60 sm:items-end">
                    envoyée le {formatDate(g.envoyee_le)}
                    <Link href={`/admin/comptes/${g.employeur_id}#gestion-${g.id}`} className="btn btn-primaire btn-sm">
                      Vérifier et valider
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="declarations" className="mt-8 scroll-mt-4">
          <h2 className="font-bold text-brand-violet">
            Déclarations à traiter ({aTraiter.length})
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            Envoyées par les abonnés, en attente du bulletin. Une déclaration
            disparaît d&apos;elle-même de cette liste dès que le bulletin du
            mois est déposé pour la gestion concernée.
          </p>
          {aTraiter.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">Rien en attente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-brand-gray/15 rounded-lg border border-brand-violet/30">
              {aTraiter.map((d) => (
                <li key={d.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-start sm:gap-4">
                  <span className="w-20 shrink-0 font-mono text-xs text-foreground/60">
                    {d.gestion?.reference}
                  </span>
                  <span className="flex-1">
                    <Link
                      href={`/admin/comptes/${d.employeur_id}?depot=${d.gestion_id}&periode=${d.periode}${d.statut === "modification" ? "&remplacer=1" : ""}#depot-${d.gestion_id}`}
                      className="font-medium text-brand-teal underline"
                    >
                      {`${d.employeur?.prenom ?? ""} ${d.employeur?.nom ?? ""}`.trim() || "(sans nom)"}
                    </Link>
                    {" → "}
                    {`${d.gestion?.prenom_salarie ?? ""} ${d.gestion?.nom_salarie ?? ""}`.trim()}
                    <span className="block text-foreground/70">
                      {libelleMois(d.periode)} · {formatHeures(d.heures)}
                      {d.commentaire ? ` · « ${d.commentaire} »` : ""}
                    </span>
                    {d.statut === "modification" && (
                      <span className="mt-1 block rounded bg-brand-jaune/40 px-2 py-1 text-brand-black">
                        Modification demandée : « {d.motif_modification} »
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-start gap-1 text-xs text-foreground/60 sm:items-end">
                    envoyée le {formatDate(d.envoyee_le)}
                    <Link
                      href={`/admin/comptes/${d.employeur_id}?depot=${d.gestion_id}&periode=${d.periode}${d.statut === "modification" ? "&remplacer=1" : ""}#depot-${d.gestion_id}`}
                      className="btn btn-primaire btn-sm"
                    >
                      {d.statut === "modification" ? "Déposer le bulletin corrigé" : "Déposer le bulletin"}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <h2 className="mt-10 font-bold text-brand-teal">Comptes</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-brand-gray/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-sky-tint/30 text-brand-black">
              <tr>
                <th className="px-4 py-2 font-medium">Compte</th>
                <th className="px-4 py-2 font-medium">Rôle</th>
                <th className="px-4 py-2 font-medium">Inscrit le</th>
                <th className="px-4 py-2 font-medium">Abonnement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/15">
              {comptes.map((c) => {
                const quota = quotaParCompte.get(c.id);
                return (
                  <tr key={c.id} className="relative cursor-pointer hover:bg-brand-sky-tint/25">
                    {/* Toute la ligne est cliquable : le lien du nom s'étend
                        sur la ligne entière (pseudo-élément ::after). */}
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/comptes/${c.id}`}
                        className="font-medium text-brand-teal underline after:absolute after:inset-0 after:content-['']"
                      >
                        {`${c.prenom} ${c.nom}`.trim() || "(sans nom)"}
                      </Link>
                      <div className="text-foreground/60">{c.email}</div>
                    </td>
                    <td className="px-4 py-2">{c.role}</td>
                    <td className="px-4 py-2">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-2">
                      {quota === undefined
                        ? "—"
                        : `Actif · ${enCoursParCompte.get(c.id) ?? 0} / ${quota} gestions`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
