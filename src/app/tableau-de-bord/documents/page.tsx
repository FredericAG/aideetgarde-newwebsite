import Link from "next/link";
import { BoutonTelechargement } from "@/components/BoutonTelechargement";
import { DocumentsParCategorie } from "@/components/DocumentsParCategorie";
import { NouveauxDocuments } from "@/components/NouveauxDocuments";
import { requireUser } from "@/lib/auth";
import {
  TYPES_GESTION,
  nomSalarie,
  trierDocuments,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";

export const metadata = { title: "Mes documents — Aide & Garde" };

/**
 * Tous les documents de l'abonné, salarié par salarié (onglet « Documents »
 * de la barre du téléphone). Un filtre par salarié évite une page trop
 * longue quand il y a plusieurs gestions.
 */
export default async function MesDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const filtre = Array.isArray(sp.salarie) ? sp.salarie[0] : sp.salarie;

  const { supabase, user } = await requireUser("/tableau-de-bord/documents");

  const [gestionsRes, docsRes] = await Promise.all([
    supabase
      .from("gestions")
      .select("*")
      .eq("employeur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, storage_path, created_at, consulte_le")
      .eq("employeur_id", user.id),
  ]);

  // Gestions en cours d'abord, puis terminées.
  const tous = (docsRes.data ?? []) as DocumentRow[];
  // Gestions démarrées (en cours ou terminées), ou ayant déjà un document.
  const gestions = ((gestionsRes.data ?? []) as Gestion[])
    .filter((g) => g.statut === "en_cours" || g.statut === "terminee" || tous.some((d) => d.gestion_id === g.id))
    .sort(
    (a, b) => Number(a.statut !== "en_cours") - Number(b.statut !== "en_cours"),
  );
  const documents = trierDocuments(tous, "recent");
  const affichees = gestions.filter((g) => !filtre || g.id === filtre);
  const parId = new Map(gestions.map((g) => [g.id, g]));

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Mes documents</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Tous vos documents, classés par salarié puis par catégorie. Ils
          restent disponibles en permanence dans votre espace.
        </p>

        <NouveauxDocuments
          documents={documents}
          salaries={Object.fromEntries(
            documents.map((d) => {
              const g = parId.get(d.gestion_id);
              return [d.id, g ? nomSalarie(g) : ""];
            }),
          )}
        />

        {gestions.length > 1 && (
          <nav aria-label="Choisir un salarié" className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/tableau-de-bord/documents"
              scroll={false}
              aria-current={!filtre ? "true" : undefined}
              className={`btn btn-sm ${!filtre ? "btn-primaire" : "btn-secondaire"}`}
            >
              Tous
            </Link>
            {gestions.map((g) => (
              <Link
                key={g.id}
                href={`/tableau-de-bord/documents?salarie=${g.id}`}
                scroll={false}
                aria-current={filtre === g.id ? "true" : undefined}
                className={`btn btn-sm ${filtre === g.id ? "btn-primaire" : "btn-secondaire"}`}
              >
                {nomSalarie(g)}
                {g.statut !== "en_cours" && " (terminée)"}
              </Link>
            ))}
          </nav>
        )}

        {affichees.length === 0 && (
          <p className="mt-6 text-sm text-foreground/70">Aucun document pour le moment.</p>
        )}

        {affichees.map((g) => {
          const docs = documents.filter((d) => d.gestion_id === g.id);
          return (
            <section key={g.id} className="mt-8" aria-label={nomSalarie(g)}>
              <h2 className="flex flex-wrap items-baseline gap-x-3 font-bold text-brand-teal">
                {nomSalarie(g)}
                <span className="text-sm font-normal text-foreground/60">
                  {TYPES_GESTION[g.type_gestion]}
                  {g.statut !== "en_cours" && " · terminée"} · {docs.length} document(s)
                </span>
                <Link
                  href={`/tableau-de-bord/gestions/${g.id}`}
                  className="text-sm font-normal text-brand-teal underline"
                >
                  Voir la gestion
                </Link>
              </h2>
              {docs.length === 0 ? (
                <p className="mt-2 text-sm text-foreground/60">Aucun document.</p>
              ) : (
                <DocumentsParCategorie
                  documents={docs}
                  vue="abonne"
                  action={(d) =>
                    d.storage_path ? (
                      <BoutonTelechargement documentId={d.id} titre={d.titre} />
                    ) : null
                  }
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
