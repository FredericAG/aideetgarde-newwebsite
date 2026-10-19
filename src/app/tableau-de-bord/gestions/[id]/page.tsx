import Link from "next/link";
import { notFound } from "next/navigation";
import { InfosDocument } from "@/components/TitreDocument";
import { requireUser } from "@/lib/auth";
import { DeclarationMois } from "./DeclarationMois";
import {
  LIBELLES_TRI,
  TYPES_GESTION,
  formatDate,
  isUuid,
  nomSalarie,
  periodesDeclarables,
  trierDocuments,
  type Declaration,
  type DocumentRow,
  type Gestion,
  type TriDocuments,
} from "@/lib/data";

/**
 * Détail d'une gestion : informations et documents associés.
 * Les documents sont classés du plus récent au plus ancien ; l'abonné peut
 * changer de tri (ancien, alphabétique, par type) via les liens au-dessus
 * de la liste. Le tri choisi est dans l'adresse (?tri=...), ce qui
 * fonctionne sans JavaScript et se partage/rafraîchit sans le perdre.
 */
export default async function DetailGestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const triDemande = Array.isArray(sp.tri) ? sp.tri[0] : sp.tri;
  const tri: TriDocuments =
    triDemande && triDemande in LIBELLES_TRI ? (triDemande as TriDocuments) : "recent";

  const { supabase, user } = await requireUser(`/tableau-de-bord/gestions/${id}`);

  // `.eq("employeur_id", user.id)` : même raison que sur le tableau de bord
  // (un administrateur ne doit pas voir ici la gestion d'un autre compte
  // sous prétexte que la base le lui permet).
  const { data: gestion } = await supabase
    .from("gestions")
    .select("*")
    .eq("id", id)
    .eq("employeur_id", user.id)
    .maybeSingle<Gestion>();

  if (!gestion) notFound();

  const [{ data: docs }, { data: decls }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, storage_path, created_at")
      .eq("gestion_id", id),
    supabase
      .from("declarations_mensuelles")
      .select("id, gestion_id, periode, heures, commentaire, statut, envoyee_le, traitee_le, motif_modification, modification_demandee_le")
      .eq("gestion_id", id)
      .eq("employeur_id", user.id),
  ]);
  const declarations = (decls ?? []) as Declaration[];
  const { options, parDefaut } = periodesDeclarables();

  const documents = trierDocuments((docs ?? []) as DocumentRow[], tri);

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <Link href="/tableau-de-bord" className="text-sm text-brand-teal underline">
          ← Tableau de bord
        </Link>

        <h1 className="mt-4 font-display font-black text-2xl text-brand-teal">
          {nomSalarie(gestion)}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {TYPES_GESTION[gestion.type_gestion]} ·{" "}
          {gestion.statut === "en_cours"
            ? `en cours depuis le ${formatDate(gestion.date_debut)}`
            : `terminée (du ${formatDate(gestion.date_debut)} au ${formatDate(gestion.date_fin)})`}
        </p>

        {gestion.statut === "en_cours" && (
          <DeclarationMois
            gestionId={gestion.id}
            options={options}
            parDefaut={parDefaut}
            declarations={declarations}
            periodesAvecBulletin={documents
              .filter((d) => d.type_document === "bulletin" && d.periode)
              .map((d) => d.periode as string)}
          />
        )}

        <h2 className="mt-8 font-bold text-brand-teal">
          Documents ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">
            Aucun document pour cette gestion.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-foreground/60">
              Cliquez sur un document pour le télécharger. Vos documents
              restent disponibles en permanence dans votre espace.
            </p>

            <nav
              aria-label="Trier les documents"
              className="mt-4 flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="text-foreground/60">Trier :</span>
              {(Object.keys(LIBELLES_TRI) as TriDocuments[]).map((cle) => (
                <Link
                  key={cle}
                  href={cle === "recent" ? `?` : `?tri=${cle}`}
                  scroll={false}
                  aria-current={cle === tri ? "true" : undefined}
                  className={`rounded-full border px-3 py-1 ${
                    cle === tri
                      ? "border-brand-teal bg-brand-teal text-white"
                      : "border-brand-gray/40 hover:border-brand-teal"
                  }`}
                >
                  {LIBELLES_TRI[cle]}
                </Link>
              ))}
            </nav>

            <ul className="mt-3 divide-y divide-brand-gray/15 rounded-lg border border-brand-gray/20">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <InfosDocument doc={d} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
