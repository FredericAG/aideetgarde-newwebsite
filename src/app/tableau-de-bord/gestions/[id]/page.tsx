import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AutreCompte } from "@/components/AutreCompte";
import { DemandeAvenant } from "./DemandeAvenant";
import { DocumentsParCategorie } from "@/components/DocumentsParCategorie";
import { BoutonConfirme } from "@/components/BoutonConfirme";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { IconePoubelle } from "@/components/IconePoubelle";
import { RecapGestion } from "@/components/RecapGestion";
import { FormulaireGestion } from "../FormulaireGestion";
import { placesAbonnement, salariesRemplacables } from "@/lib/places";
import { annulerEnvoi, supprimerBrouillon } from "../actions";
import { BoutonTelechargement } from "@/components/BoutonTelechargement";
import { requireUser } from "@/lib/auth";
import { DeclarationMois } from "./DeclarationMois";
import { NouveauxDocuments } from "@/components/NouveauxDocuments";
import {
  LIBELLES_STATUT_GESTION,
  LIBELLES_TRI,
  TYPES_GESTION,
  formatDate,
  isUuid,
  nomSalarie,
  MOTIFS_REMPLACEMENT,
  periodesDeclarables,
  trierDocuments,
  type Declaration,
  type DemandeAvenant as DemandeAvenantType,
  type DocumentRow,
  type Gestion,
  type TriDocuments,
  intituleDocument,
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
  const messageOk = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const messageErreur = Array.isArray(sp.erreur) ? sp.erreur[0] : sp.erreur;
  const tri: TriDocuments =
    triDemande && triDemande in LIBELLES_TRI ? (triDemande as TriDocuments) : "recent";

  const { supabase, user, profile } = await requireUser(`/tableau-de-bord/gestions/${id}`);

  // `.eq("employeur_id", user.id)` : même raison que sur le tableau de bord
  // (un administrateur ne doit pas voir ici la gestion d'un autre compte
  // sous prétexte que la base le lui permet).
  const { data: gestion } = await supabase
    .from("gestions")
    .select("*")
    .eq("id", id)
    .eq("employeur_id", user.id)
    .maybeSingle<Gestion>();

  if (!gestion) {
    // Lien reçu par email ou notification, mais ouvert avec un autre compte
    // (cas fréquent : l'administrateur clique le lien d'un email de test).
    // L'administrateur est conduit à la fiche du compte concerné ; un
    // abonné voit une explication plutôt qu'une page introuvable.
    if (profile?.role === "admin") {
      const { data: autre } = await supabase
        .from("gestions")
        .select("employeur_id")
        .eq("id", id)
        .maybeSingle();
      if (autre) redirect(`/admin/comptes/${autre.employeur_id}#gestion-${id}`);
      notFound();
    }
    return <AutreCompte email={user.email} retour={`/tableau-de-bord/gestions/${id}`} />;
  }

  const [{ data: docs }, { data: decls }, { data: avenants }, { data: liees }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, complement, storage_path, created_at, consulte_le")
      .eq("gestion_id", id),
    supabase
      .from("declarations_mensuelles")
      // « * » : inclut la réponse de l'administration (brique 7d) sans
      // échouer si le script n'a pas encore été exécuté.
      .select("*")
      .eq("gestion_id", id)
      .eq("employeur_id", user.id),
    // Demandes d'avenant (brique 3b ; sans le script, aucune) : celle en
    // attente, et la dernière réponse d'Aide & Garde.
    supabase
      .from("demandes_avenant")
      .select("*")
      .eq("gestion_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    // CDD de remplacement (brique 3d) : le salarié remplacé, ou le remplaçant
    // actif de ce salarié.
    supabase
      .from("gestions")
      .select("id, prenom_salarie, nom_salarie, statut, remplace_gestion_id")
      .eq("employeur_id", user.id)
      .or(
        gestion.remplace_gestion_id
          ? `id.eq.${gestion.remplace_gestion_id},remplace_gestion_id.eq.${id}`
          : `remplace_gestion_id.eq.${id}`,
      ),
  ]);
  const lies = (liees ?? []) as Pick<Gestion, "id" | "prenom_salarie" | "nom_salarie" | "statut" | "remplace_gestion_id">[];
  const remplace = gestion.remplace_gestion_id ? lies.find((g) => g.id === gestion.remplace_gestion_id) : undefined;
  const remplacant = lies.find(
    (g) => g.remplace_gestion_id === id && ["brouillon", "envoyee", "en_cours"].includes(g.statut),
  );
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
          {nomSalarie(gestion) || "Nouveau salarié"}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {TYPES_GESTION[gestion.type_gestion]} ·{" "}
          {gestion.statut === "en_cours"
            ? `en cours depuis le ${formatDate(gestion.date_debut)}`
            : gestion.statut === "terminee"
              ? `terminée (du ${formatDate(gestion.date_debut)} au ${formatDate(gestion.date_fin)})`
              : LIBELLES_STATUT_GESTION[gestion.statut].toLowerCase()}
        </p>

        {/* CDD de remplacement (brique 3d) */}
        {remplace && (
          <p className="mt-2 text-sm">
            CDD de remplacement de{" "}
            <Link href={`/tableau-de-bord/gestions/${remplace.id}`} className="font-medium text-brand-teal underline">
              {nomSalarie(remplace)}
            </Link>
            {gestion.motif_remplacement ? ` (${MOTIFS_REMPLACEMENT[gestion.motif_remplacement]})` : ""}, sans surcoût
            d&apos;abonnement.
          </p>
        )}
        {gestion.statut === "en_cours" && !gestion.remplace_gestion_id && (
          remplacant ? (
            <p className="mt-2 text-sm">
              Remplacement prévu :{" "}
              <Link href={`/tableau-de-bord/gestions/${remplacant.id}`} className="font-medium text-brand-teal underline">
                {nomSalarie(remplacant) || "salarié remplaçant"}
              </Link>
              {remplacant.statut === "brouillon" ? " (brouillon à compléter)" : remplacant.statut === "envoyee" ? " (en attente de validation)" : ""}.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link href={`/tableau-de-bord/gestions/nouvelle?remplace=${id}`} className="btn btn-secondaire btn-sm">
                + Ajouter un salarié remplaçant
              </Link>
              <span className="text-xs text-foreground/60">
                Congé maternité ou arrêt maladie : CDD de remplacement, sans surcoût.
              </span>
            </div>
          )
        )}

        {messageOk && (
          <p role="status" className="mt-6 rounded-lg border border-brand-teal/40 bg-brand-teal/10 p-3 text-sm text-brand-teal">
            {messageOk}
          </p>
        )}
        {messageErreur && (
          <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {messageErreur}
          </p>
        )}

        {/* Brouillon : l'abonné complète et envoie (brique 3) */}
        {gestion.statut === "brouillon" && (
          <>
            {gestion.motif_retour && (
              <div className="mt-6 rounded-xl border-2 border-brand-jaune bg-brand-jaune/25 p-4 text-sm">
                <p className="font-bold text-brand-violet">Aide &amp; Garde vous demande de compléter :</p>
                <p className="mt-1 whitespace-pre-line">{gestion.motif_retour}</p>
              </div>
            )}
            <FormulaireGestion
              gestion={gestion}
              quota={(await placesAbonnement(supabase, user.id)) ?? undefined}
              salariesEnCours={await salariesRemplacables(supabase, user.id)}
            />
            <form action={supprimerBrouillon} className="mt-8 border-t border-brand-gray/20 pt-6">
              <input type="hidden" name="gestion_id" value={gestion.id} />
              <BoutonConfirme
                className="btn btn-danger"
                enCours="Suppression…"
                question="Supprimer ce brouillon ?"
                precision="Les informations saisies pour ce salarié seront effacées."
                oui="Oui, supprimer"
              >
                <IconePoubelle /> Supprimer le brouillon
              </BoutonConfirme>
            </form>
          </>
        )}

        {/* Envoyée : en attente de validation par Aide & Garde */}
        {gestion.statut === "envoyee" && (
          <>
            <div className="mt-6 rounded-xl border-2 border-brand-violet/40 bg-brand-violet/5 p-4 text-sm">
              <p className="font-bold text-brand-violet">
                Envoyée le {formatDate(gestion.envoyee_le)} : en attente de validation
              </p>
              <p className="mt-1 text-foreground/80">
                Aide &amp; Garde vérifie les informations et démarre la gestion.
                Vous serez prévenu dès qu&apos;elle sera validée, ou si une
                information manque.
              </p>
            </div>
            <section className="carte mt-6 p-4 sm:p-5">
              <h2 className="mb-3 font-bold text-brand-teal">Informations envoyées</h2>
              <RecapGestion gestion={gestion} />
            </section>
            <form action={annulerEnvoi} className="mt-6">
              <input type="hidden" name="gestion_id" value={gestion.id} />
              <BoutonEnvoi className="btn btn-secondaire" enCours="En cours…">
                Annuler l&apos;envoi pour modifier
              </BoutonEnvoi>
            </form>
          </>
        )}

        {(gestion.statut === "en_cours" || gestion.statut === "terminee") && (
          <>
        <NouveauxDocuments documents={documents} />

        {gestion.statut === "en_cours" && (
          <DeclarationMois
            gestionId={gestion.id}
            options={options}
            parDefaut={parDefaut}
            declarations={declarations}
            bulletins={Object.fromEntries(
              documents
                .filter((d) => d.type_document === "bulletin" && d.periode && d.storage_path)
                .map((d) => [d.periode as string, d.id]),
            )}
          />
        )}

        {(() => {
          const r = reponseAvenantRecente((avenants ?? []) as DemandeAvenantType[]);
          if (!r) return null;
          return (
            <p className="mt-6 rounded-md border-l-4 border-brand-violet bg-white p-3 text-sm">
              <strong className="text-brand-violet">
                {r.statut === "close" ? "Demande d'avenant close" : "Demande d'avenant traitée"}
              </strong>{" "}
              le {formatDate(r.traitee_le)}
              {r.statut === "close" ? " : pas d'avenant nécessaire." : "."}
              {r.reponse_admin && (
                <span className="mt-1 block text-foreground/80">« {r.reponse_admin} »</span>
              )}
            </p>
          );
        })()}

        {gestion.statut === "en_cours" && (
          <DemandeAvenant
            gestionId={gestion.id}
            enAttente={((avenants ?? []) as DemandeAvenantType[]).find((a) => a.statut === "envoyee") ?? null}
          />
        )}

        {gestion.statut === "en_cours" && (
          <aside className="mt-6 flex flex-col gap-2 rounded-lg border-l-4 border-brand-teal bg-brand-sky-tint/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong className="text-brand-teal">Pour votre salarié :</strong> loisirs à prix réduits, suivi médical,
              protection sociale. Une page à lui remettre.
            </span>
            <a
              href="/avantages/fiche?depuis=gestion"
              download="Droits-et-avantages-salarie.pdf"
              className="btn btn-secondaire btn-sm shrink-0 self-start sm:self-auto"
            >
              Télécharger la fiche
            </a>
          </aside>
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
              Vos documents sont classés en trois catégories. Cliquez sur
              un titre ou sur « Télécharger » pour l&apos;enregistrer ; ils
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
                  className={`btn btn-sm ${cle === tri ? "btn-primaire" : "btn-secondaire"}`}
                >
                  {LIBELLES_TRI[cle]}
                </Link>
              ))}
            </nav>

            <DocumentsParCategorie
              documents={documents}
              vue="abonne"
              action={(d) =>
                d.storage_path ? (
                  <BoutonTelechargement documentId={d.id} titre={intituleDocument(d)} />
                ) : null
              }
            />
          </>
        )}

        {gestion.type_contrat && (
          <details className="carte mt-8 p-4 sm:p-5">
            <summary className="font-bold text-brand-teal">Informations du contrat</summary>
            <div className="mt-3">
              <RecapGestion gestion={gestion} />
            </div>
          </details>
        )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Dernière réponse d'Aide & Garde à une demande d'avenant (clôture ou
 * commentaire), affichée pendant 60 jours, sauf si une nouvelle demande est
 * en attente.
 */
function reponseAvenantRecente(liste: DemandeAvenantType[]): DemandeAvenantType | null {
  const r = liste.find((x) => x.statut !== "envoyee");
  if (!r || liste.some((x) => x.statut === "envoyee")) return null;
  if (!r.reponse_admin && r.statut !== "close") return null;
  if (!r.traitee_le || Date.now() - new Date(r.traitee_le).getTime() > 60 * 86400000) return null;
  return r;
}
