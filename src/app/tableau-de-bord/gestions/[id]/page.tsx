import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  TYPES_DOCUMENT,
  TYPES_GESTION,
  formatDate,
  formatPeriode,
  isUuid,
  nomSalarie,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";

/** Détail d'une gestion : informations et documents associés. */
export default async function DetailGestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

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

  const { data: docs } = await supabase
    .from("documents")
    .select("id, gestion_id, type_document, periode, titre, created_at")
    .eq("gestion_id", id)
    .order("periode", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const documents = (docs ?? []) as DocumentRow[];

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

        <h2 className="mt-8 font-bold text-brand-teal">Documents</h2>
        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">
            Aucun document pour cette gestion.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-gray/15 rounded-lg border border-brand-gray/20">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="font-medium">{d.titre}</span>
                <span className="text-foreground/60">
                  {TYPES_DOCUMENT[d.type_document]}
                  {d.periode ? ` · ${formatPeriode(d.periode)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
