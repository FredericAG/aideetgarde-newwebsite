import Link from "next/link";
import { redirect } from "next/navigation";
import { BoutonTelechargement } from "@/components/BoutonTelechargement";
import { DocumentsParCategorie } from "@/components/DocumentsParCategorie";
import { requireUser } from "@/lib/auth";
import {
  TYPES_GESTION,
  formatDate,
  intituleDocument,
  nomSalarie,
  trierDocuments,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";

export const metadata = { title: "Mes documents — Aide & Garde" };

/**
 * Documents de l'abonné (onglet « Documents ») : une pastille par salarié
 * (gestions en cours, puis terminées), la première sélectionnée par
 * défaut, et les documents du salarié choisi par catégorie. Le nombre de
 * nouveaux documents figure sur chaque pastille.
 */
export default async function MesDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const filtre = Array.isArray(sp.salarie) ? sp.salarie[0] : sp.salarie;

  const { supabase, user, profile } = await requireUser("/tableau-de-bord/documents");
  // L'administrateur n'a pas d'espace abonné : on l'envoie à l'administration.
  if (profile?.role === "admin") redirect("/admin");

  const [gestionsRes, docsRes] = await Promise.all([
    supabase
      .from("gestions")
      .select("*")
      .eq("employeur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, complement, storage_path, created_at, consulte_le")
      .eq("employeur_id", user.id),
  ]);

  const tous = (docsRes.data ?? []) as DocumentRow[];
  // Gestions démarrées (en cours ou terminées), ou ayant déjà un document ;
  // en cours d'abord, puis terminées (les plus récentes d'abord).
  const gestions = ((gestionsRes.data ?? []) as Gestion[])
    .filter((g) => g.statut === "en_cours" || g.statut === "terminee" || tous.some((d) => d.gestion_id === g.id))
    .sort((a, b) => Number(a.statut !== "en_cours") - Number(b.statut !== "en_cours"));
  const enCours = gestions.filter((g) => g.statut === "en_cours");
  const autres = gestions.filter((g) => g.statut !== "en_cours");
  const nouveaux = (g: Gestion) => tous.filter((d) => d.gestion_id === g.id && d.storage_path && !d.consulte_le).length;
  // Plus d'option « Tous » (retour du 21/10) : une gestion est toujours
  // sélectionnée. Par défaut : celle qui a un nouveau document, sinon celle
  // dont le dernier document est le plus récent, sinon la première.
  const dernierDepot = (g: Gestion) =>
    tous.filter((d) => d.gestion_id === g.id).reduce((m, d) => (d.created_at > m ? d.created_at : m), "");
  const parDefaut =
    gestions.find((g) => nouveaux(g) > 0) ??
    [...gestions].sort((a, b) => dernierDepot(b).localeCompare(dernierDepot(a)))[0] ??
    null;
  const choisie = gestions.find((g) => g.id === filtre) ?? parDefaut;
  const docs = choisie ? trierDocuments(tous.filter((d) => d.gestion_id === choisie.id), "recent") : [];

  const onglet = (g: Gestion) => {
    const actif = choisie?.id === g.id;
    const n = nouveaux(g);
    return (
      <Link
        key={g.id}
        href={`/tableau-de-bord/documents?salarie=${g.id}`}
        scroll={false}
        aria-current={actif ? "page" : undefined}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors ${
          actif
            ? "border-brand-violet bg-brand-violet text-white"
            : "border-brand-violet/30 bg-white text-brand-violet hover:border-brand-violet"
        }`}
      >
        {nomSalarie(g)}
        {n > 0 && (
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
              actif ? "bg-white text-brand-violet" : "bg-brand-jaune text-brand-black"
            }`}
            title={`${n} nouveau(x) document(s)`}
          >
            {n}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Mes documents</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Bulletins, contrats et attestations de chaque salarié, disponibles en permanence.
        </p>

        {gestions.length === 0 && (
          <p className="carte mt-6 p-4 text-sm text-foreground/70">Aucun document pour le moment.</p>
        )}

        {/* Choix du salarié : une pastille par gestion, comme des onglets.
            Sur téléphone, la rangée défile horizontalement. */}
        {gestions.length > 1 && (
          <nav aria-label="Choisir un salarié" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
              {enCours.map(onglet)}
              {autres.length > 0 && (
                <>
                  <span className="ml-1 shrink-0 text-xs font-bold uppercase tracking-wide text-foreground/50">
                    Terminées
                  </span>
                  {autres.map(onglet)}
                </>
              )}
            </div>
          </nav>
        )}

        {choisie && (
          <section className="mt-6" aria-labelledby="titre-gestion">
            <div className="carte flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <div>
                <h2 id="titre-gestion" className="font-bold text-brand-teal">
                  {nomSalarie(choisie)}
                </h2>
                <p className="text-xs text-foreground/60">
                  {TYPES_GESTION[choisie.type_gestion]}
                  {choisie.statut === "en_cours"
                    ? ` · depuis le ${formatDate(choisie.date_debut)}`
                    : ` · terminée${choisie.date_fin ? ` le ${formatDate(choisie.date_fin)}` : ""}`}
                  {` · ${docs.length} document${docs.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <Link
                href={`/tableau-de-bord/gestions/${choisie.id}`}
                className="text-sm font-medium text-brand-teal underline"
              >
                Voir la gestion ›
              </Link>
            </div>
            {docs.length === 0 ? (
              <p className="mt-3 text-sm text-foreground/60">Aucun document pour ce salarié.</p>
            ) : (
              <DocumentsParCategorie
                documents={docs}
                vue="abonne"
                action={(d) =>
                  d.storage_path ? (
                    <BoutonTelechargement documentId={d.id} titre={intituleDocument(d)} />
                  ) : null
                }
              />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
