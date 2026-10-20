import Link from "next/link";
import {
  OBJETS_AVENANT,
  TYPES_GESTION,
  formatDate,
  formatHeures,
  libelleMois,
  type ObjetAvenant,
} from "@/lib/data";

export interface DeclarationATraiter {
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

export interface GestionAValider {
  id: string;
  reference: string;
  prenom_salarie: string;
  nom_salarie: string;
  type_gestion: keyof typeof TYPES_GESTION;
  envoyee_le: string;
  employeur_id: string;
  employeur: { prenom: string; nom: string } | null;
}

export interface AvenantATraiter {
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


/**
 * Détail des actions qui attendent l'administrateur, par type : demandes
 * d'avenant, gestions à valider, déclarations du mois. Affiché sous la liste
 * des comptes (repliable).
 */
export function DetailActions({
  avenants,
  aValider,
  aTraiter,
}: {
  avenants: AvenantATraiter[];
  aValider: GestionAValider[];
  aTraiter: DeclarationATraiter[];
}) {
  return (
    <>
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
    </>
  );
}
