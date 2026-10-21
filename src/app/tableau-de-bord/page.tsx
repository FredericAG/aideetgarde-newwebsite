import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationsPush } from "@/components/NotificationsPush";
import { NouveauxDocuments } from "@/components/NouveauxDocuments";
import { LienTelechargement } from "@/components/LienTelechargement";
import { requireUser } from "@/lib/auth";
import {
  TYPES_GESTION,
  formatDate,
  formatPeriode,
  formatEuros,
  libelleMois,
  nomSalarie,
  periodesDeclarables,
  type Abonnement,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";

/**
 * Tableau de bord de l'abonné, simplifié le 21/10 : seulement ce qui
 * demande son attention (alertes, nouveaux documents, gestions en
 * préparation) et ses salariés avec le statut du mois. Les listes de
 * documents sont dans l'onglet Documents, le détail de l'abonnement dans
 * l'onglet Abonnement : rien n'est affiché deux fois.
 *
 * Important : on filtre explicitement sur `employeur_id = user.id`. Pour un
 * employeur, la base ne lui renverrait de toute façon que ses lignes (RLS) ;
 * mais un administrateur qui ouvre cette page verrait sinon les données de
 * TOUS les comptes mélangées.
 */
export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const messageOk = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const { supabase, user, profile } = await requireUser("/tableau-de-bord");
  // L'administrateur n'a pas d'espace abonné : on l'envoie à l'administration.
  if (profile?.role === "admin") redirect("/admin");

  const moisCourant = periodesDeclarables().parDefaut;

  const [abosRes, gestionsRes, declsRes, nouveauxRes, bulletinsRes] = await Promise.all([
    supabase
      .from("abonnements")
      .select("*")
      .eq("employeur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("gestions")
      .select("*")
      .eq("employeur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("declarations_mensuelles")
      .select("gestion_id, statut")
      .eq("employeur_id", user.id)
      .eq("periode", moisCourant),
    // Documents pas encore téléchargés, mis en avant en haut de page.
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, complement, storage_path, created_at, consulte_le")
      .eq("employeur_id", user.id)
      .is("consulte_le", null)
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),
    // Bulletins en ligne, du plus récent au plus ancien : le premier de
    // chaque gestion alimente la colonne « Dernier bulletin ».
    supabase
      .from("documents")
      .select("id, gestion_id, periode, consulte_le")
      .eq("employeur_id", user.id)
      .eq("type_document", "bulletin")
      .not("storage_path", "is", null)
      .order("periode", { ascending: false, nullsFirst: false })
      .limit(300),
  ]);

  const erreur = abosRes.error || gestionsRes.error;
  // declsRes.error n'est pas bloquant : sans le script brique7a, la
  // colonne « déclaration » affiche simplement le bouton.
  const abonnements = (abosRes.data ?? []) as Abonnement[];
  const gestions = (gestionsRes.data ?? []) as Gestion[];

  const abonnement =
    abonnements.find((a) => a.statut === "actif") ?? abonnements[0] ?? null;
  const enCours = gestions.filter((g) => g.statut === "en_cours");
  // Brique 3 : gestions créées par l'abonné, pas encore démarrées.
  const enPreparation = gestions.filter((g) => g.statut === "brouillon" || g.statut === "envoyee");
  // Places occupées dans l'abonnement : gestions en cours + envoyées.
  const placesUtilisees = gestions.filter((g) => g.statut === "en_cours" || g.statut === "envoyee").length;
  const gestionParId = new Map(gestions.map((g) => [g.id, g]));
  const dernierBulletin = new Map<
    string,
    { id: string; periode: string | null; consulte_le: string | null }
  >();
  for (const b of bulletinsRes.data ?? []) {
    if (!dernierBulletin.has(b.gestion_id)) dernierBulletin.set(b.gestion_id, b);
  }
  const statutDeclaration = new Map(
    (declsRes.data ?? []).map((d) => [d.gestion_id as string, d.statut as string]),
  );

  const moisLibelle = libelleMois(moisCourant);
  const moisCourt = moisLibelle.split(" ")[0];
  const paiementEnDefaut =
    abonnement?.statut === "actif" && abonnement.statut_paiement && abonnement.statut_paiement !== "a_jour";
  const quotaAtteint = abonnement?.statut === "actif" && placesUtilisees >= abonnement.quota_gestions;
  const quotaDepasse = abonnement?.statut === "actif" && placesUtilisees > abonnement.quota_gestions;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Bonjour{profile?.prenom ? ` ${profile.prenom}` : ""}
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          {enCours.length === 0
            ? "Votre espace Aide & Garde."
            : `Vos salariés et le mois de ${moisLibelle}.`}
        </p>

        {messageOk && (
          <p role="status" className="mt-6 rounded-lg border border-brand-teal/40 bg-brand-teal/10 p-3 text-sm text-brand-teal">
            {messageOk}
          </p>
        )}

        {erreur && (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Impossible de charger toutes vos données pour le moment. Réessayez
            dans un instant.
          </p>
        )}

        {/* --- Alertes : seulement ce qui demande une action --- */}
        {paiementEnDefaut && (
          <p className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>
              <strong>{abonnement?.statut_paiement === "impaye" ? "Échéance impayée" : "Prélèvement refusé"}</strong>{" "}
              : votre banque a refusé le dernier prélèvement.
            </span>
            <Link href="/tableau-de-bord/abonnement" className="btn btn-primaire btn-sm">
              Régler en ligne
            </Link>
          </p>
        )}
        {quotaAtteint && (
          <p className="mt-6 rounded-lg border border-brand-jaune bg-brand-jaune/25 px-4 py-3 text-sm">
            {quotaDepasse ? (
              <>
                <strong>Vous dépassez votre abonnement</strong> : {placesUtilisees} gestions pour{" "}
                {abonnement?.quota_gestions} prévues. Aide &amp; Garde va vous contacter pour l&apos;ajuster.
              </>
            ) : (
              <>
                <strong>Abonnement complet</strong> : pour ajouter un salarié, terminez une gestion ou{" "}
                <Link href="/aide" className="text-brand-teal underline">contactez-nous</Link>.
              </>
            )}
          </p>
        )}
        {!abonnement || abonnement.statut !== "actif" ? (
          <div className="carte mt-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              {abonnement
                ? `Votre abonnement a pris fin le ${formatDate(abonnement.date_fin)}.`
                : "Choisissez votre formule pour confier la paie de vos salariés à Aide & Garde."}
            </span>
            <Link href="/tableau-de-bord/abonnement" className="btn btn-primaire btn-sm">
              {abonnement ? "Me réabonner" : "Choisir ma formule"}
            </Link>
          </div>
        ) : null}

        <NouveauxDocuments
          documents={(nouveauxRes.data ?? []) as DocumentRow[]}
          salaries={Object.fromEntries(
            ((nouveauxRes.data ?? []) as DocumentRow[]).map((d) => {
              const g = gestionParId.get(d.gestion_id);
              return [d.id, g ? nomSalarie(g) : ""];
            }),
          )}
        />

        {/* --- Gestions en préparation (brique 3) --- */}
        {enPreparation.length > 0 && (
          <section className="mt-8" aria-labelledby="titre-preparation">
            <h2 id="titre-preparation" className="font-bold text-brand-teal">En préparation</h2>
            <ul className="liste-alternee mt-3 divide-y divide-brand-gray/15 overflow-hidden rounded-xl border border-brand-gray/25">
              {enPreparation.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-bold text-brand-teal">{nomSalarie(g) || "Sans nom"}</span>
                    <span className="block text-xs text-foreground/70">
                      {g.statut === "brouillon"
                        ? g.motif_retour
                          ? "À compléter : Aide & Garde vous demande une précision"
                          : "Brouillon, pas encore envoyé"
                        : `Envoyée le ${formatDate(g.envoyee_le)}, en attente de validation`}
                    </span>
                  </span>
                  <Link
                    href={`/tableau-de-bord/gestions/${g.id}`}
                    className={`btn btn-sm shrink-0 ${g.statut === "brouillon" ? "btn-primaire" : "btn-secondaire"}`}
                  >
                    {g.statut === "brouillon" ? "Compléter" : "Voir"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* --- Mes salariés : le cœur de la page --- */}
        <section className="mt-8" aria-labelledby="titre-salaries">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="titre-salaries" className="font-bold text-brand-teal">Mes salariés</h2>
            {abonnement?.statut === "actif" && !quotaAtteint && (
              <Link href="/tableau-de-bord/gestions/nouvelle" className="btn btn-secondaire btn-sm">
                + Ajouter un salarié
              </Link>
            )}
          </div>
          {enCours.length === 0 ? (
            <p className="carte mt-3 p-4 text-sm text-foreground/70">
              Aucune gestion en cours.
              {abonnement?.statut === "actif" && (
                <>
                  {" "}
                  <Link href="/tableau-de-bord/gestions/nouvelle" className="font-medium text-brand-teal underline">
                    Ajouter un salarié
                  </Link>{" "}
                  pour que nous établissions ses bulletins.
                </>
              )}
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-brand-gray/25">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="entete-teal">
                  <tr>
                    <th scope="col" className="px-3 py-2">Salarié</th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sm:hidden">Bulletin</span>
                      <span className="max-sm:hidden">Dernier bulletin</span>
                    </th>
                    <th scope="col" className="px-3 py-2 capitalize">{moisCourt}</th>
                  </tr>
                </thead>
                <tbody>
                  {enCours.map((g) => {
                    const dernier = dernierBulletin.get(g.id);
                    // Statut du mois en cours. Un bulletin déjà en ligne
                    // pour ce mois vaut « disponible », même sans
                    // déclaration (dépôt direct par Aide & Garde), sauf si
                    // une correction a été demandée.
                    const declaration = statutDeclaration.get(g.id);
                    const statut =
                      declaration !== "modification" && dernier?.periode === moisCourant
                        ? "traitee"
                        : declaration;
                    return (
                      <tr key={g.id} className="border-t border-brand-gray/20 even:bg-[#f7f7f7]">
                        <td className="px-3 py-2.5 align-middle">
                          <Link
                            href={`/tableau-de-bord/gestions/${g.id}`}
                            className="group inline-flex items-center gap-1 font-bold text-brand-teal"
                          >
                            <span className="group-hover:underline">{nomSalarie(g)}</span>
                            <span aria-hidden="true" className="text-foreground/40">›</span>
                          </Link>
                          <span className="block text-xs text-foreground/60">
                            {TYPES_GESTION[g.type_gestion]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {dernier ? (
                            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <LienTelechargement
                                documentId={dernier.id}
                                className="font-medium text-brand-teal underline"
                                title="Télécharger"
                              >
                                ⬇{" "}
                                <span className="sm:hidden">{dernier.periode ? formatPeriode(dernier.periode) : "PDF"}</span>
                                <span className="max-sm:hidden">{dernier.periode ? libelleMois(dernier.periode) : "Bulletin"}</span>
                              </LienTelechargement>
                              {!dernier.consulte_le && <span className="pastille-nouveau">Nouveau</span>}
                            </span>
                          ) : (
                            <span className="text-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {statut === "traitee" ? (
                            <span className="font-bold text-brand-teal">✓ Disponible</span>
                          ) : statut === "modification" ? (
                            <span className="font-bold text-brand-violet">Correction en cours</span>
                          ) : statut === "envoyee" ? (
                            <span className="text-foreground/80">Envoyée</span>
                          ) : statut === "close" ? (
                            <Link href={`/tableau-de-bord/gestions/${g.id}#declaration`} className="text-foreground/70 underline">
                              Close
                            </Link>
                          ) : (
                            <Link
                              href={`/tableau-de-bord/gestions/${g.id}#declaration`}
                              className="btn btn-primaire btn-sm whitespace-nowrap"
                            >
                              Déclarer
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/tableau-de-bord/documents" className="font-medium text-brand-teal underline">
              Tous mes documents
            </Link>
            {abonnement?.statut === "actif" && (
              <Link href="/tableau-de-bord/abonnement" className="text-foreground/70 underline">
                Abonnement : {placesUtilisees}/{abonnement.quota_gestions} salariés · {formatEuros(abonnement.tarif_mensuel)} / mois
              </Link>
            )}
          </p>
        </section>

        <NotificationsPush compact />
      </div>
    </div>
  );
}
