import Link from "next/link";
import { DocumentsGestion } from "./DocumentsGestion";
import { RecapGestion } from "@/components/RecapGestion";
import { ContratAdmin } from "./ContratAdmin";
import { DepotDocument } from "./DepotDocument";
import { CloreDemande } from "./CloreDemande";
import { EmailCopiable } from "@/components/EmailCopiable";
import { BoutonRelance } from "../../BoutonRelance";
import { MODELES_RELANCE, contenuRelance, type ModeleRelance } from "@/lib/relances";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { BoutonConfirme } from "@/components/BoutonConfirme";
import { IconePoubelle } from "@/components/IconePoubelle";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  TYPES_GESTION,
  formatDate,
  formatEuros,
  formatHeures,
  OBJETS_AVENANT,
  isUuid,
  libelleMois,
  nomSalarie,
  trierDocuments,
  type Abonnement,
  type Declaration,
  type DemandeAvenant,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";
import {
  creerAbonnement,
  creerGestion,
  modifierAbonnement,
  resilierAbonnement,
  marquerAvenantTraite,
  cloreAvenant,
  cloreDeclaration,
  renvoyerGestion,
  rouvrirGestion,
  validerGestion,
  supprimerGestion,
  terminerGestion,
} from "./actions";

const inputClass =
  "rounded-md border border-brand-gray/40 bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-teal";
const btnClass = "btn btn-primaire btn-sm";
const btnLightClass = "btn btn-secondaire btn-sm";
const btnDangerClass = "btn btn-danger btn-sm";

interface CompteRow {
  id: string;
  email: string | null;
  role: string;
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  created_at: string;
  reference_client?: string | null;
}

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function FicheComptePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const ok = one(sp.ok);
  const erreur = one(sp.erreur);
  // Arrivée depuis « Déclarations à traiter » : gestion et mois du dépôt
  // attendu (?depot=<id gestion>&periode=AAMM).
  const depotCible = one(sp.depot);
  const periodeCible = one(sp.periode);
  const remplacerCible = one(sp.remplacer) === "1";
  // « Déposer l'avenant » (brique 3b) : type de document prérempli.
  const typeCible = one(sp.type) === "avenant" ? "avenant" : "bulletin";

  const { supabase } = await requireAdmin(`/admin/comptes/${id}`);

  // Toutes les lectures partent en même temps (un seul aller-retour réseau
  // au lieu de deux à la suite).
  const [compteRes, abosRes, gestionsRes, docsRes, declsRes, avenantsRes, paiementsRes, relancesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        // « * » : inclut la référence client (brique2g) sans échouer si le
        // script n'a pas encore été exécuté.
        "*",
      )
      .eq("id", id)
      .maybeSingle<CompteRow>(),
    supabase
      .from("abonnements")
      .select("*")
      .eq("employeur_id", id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("gestions")
      .select("*")
      .eq("employeur_id", id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("documents")
      .select("id, gestion_id, type_document, periode, titre, storage_path, created_at, consulte_le")
      .eq("employeur_id", id)
      .order("periode", { ascending: false, nullsFirst: false }),
    supabase
      .from("declarations_mensuelles")
      .select("*")
      .eq("employeur_id", id)
      .order("periode", { ascending: false }),
    // Demandes d'avenant (brique 3b ; sans le script, liste vide).
    supabase
      .from("demandes_avenant")
      .select("*")
      .eq("employeur_id", id)
      .order("created_at", { ascending: false }),
    // Paiements Systempay (brique 5a ; sans le script, liste vide).
    supabase
      .from("paiements")
      .select("id, created_at, montant, statut, code_erreur, carte_masquee, order_id, mode, source")
      .eq("employeur_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
    // Relances envoyées (brique 9c ; sans le script, aucune).
    supabase
      .from("relances")
      .select("id, modele, sujet, envoye_le, envoye, detail")
      .eq("employeur_id", id)
      .order("envoye_le", { ascending: false })
      .limit(10),
  ]);
  const relances = (relancesRes.data ?? []) as {
    id: string;
    modele: string;
    sujet: string;
    envoye_le: string;
    envoye: boolean;
    detail: string | null;
  }[];
  const paiements = paiementsRes.data ?? [];
  const avenants = (avenantsRes.data ?? []) as DemandeAvenant[];
  const declarations = (declsRes.data ?? []) as Declaration[];

  const compte = compteRes.data;
  if (!compte) notFound();

  const abonnements = (abosRes.data ?? []) as Abonnement[];
  const gestions = (gestionsRes.data ?? []) as Gestion[];
  const documents = (docsRes.data ?? []) as DocumentRow[];

  const actif = abonnements.find((a) => a.statut === "actif") ?? null;
  const anciens = abonnements.filter((a) => a.statut !== "actif");
  // Places occupées : gestions en cours + envoyées (brique 3).
  const enCours = gestions.filter((g) => g.statut === "en_cours" || g.statut === "envoyee");
  const today = new Date().toISOString().slice(0, 10);
  // Une seule gestion dépliée à la fois (les autres gardent un cadre gris
  // clair) : celle visée par le lien « Déposer le bulletin », sinon la
  // première qui attend une action.
  const gestionOuverte =
    (depotCible && gestions.some((g) => g.id === depotCible) ? depotCible : null) ??
    gestions.find((g) => g.statut === "envoyee")?.id ??
    gestions.find((g) => avenants.some((a) => a.gestion_id === g.id && a.statut === "envoyee"))?.id ??
    gestions.find((g) =>
      declarations.some((d) => d.gestion_id === g.id && d.statut !== "traitee"),
    )?.id ??
    null;

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <Link href="/admin" className="text-sm text-brand-teal underline">
          ← Tous les comptes
        </Link>

        <h1 className="mt-4 font-display font-black text-2xl text-brand-teal">
          {`${compte.prenom} ${compte.nom}`.trim() || "(sans nom)"}
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          {compte.reference_client && (
            <span className="mr-2 rounded bg-brand-sky-tint/40 px-1.5 py-0.5 font-mono text-xs text-brand-black">
              {compte.reference_client}
            </span>
          )}
          {compte.email && <EmailCopiable email={compte.email} />}
          {compte.email ? " · " : ""}inscrit le {formatDate(compte.created_at)}
        </p>
        <p className="mt-1 text-sm text-foreground/70">
          {[compte.telephone, compte.adresse, `${compte.code_postal} ${compte.ville}`.trim()]
            .filter(Boolean)
            .join(" · ") || "Coordonnées non renseignées"}
        </p>

        {ok && (
          <p
            role="status"
            className="mt-6 rounded-md border border-brand-teal/40 bg-brand-teal/10 p-3 text-sm text-brand-teal"
          >
            {ok}
          </p>
        )}
        {erreur && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {erreur}
          </p>
        )}

        {/* ------------------------------------------ Contacter l'abonné */}
        {compte.email && (() => {
          const aBrouillon = gestions.some((g) => g.statut === "brouillon");
          const aEnCours = gestions.some((g) => g.statut === "en_cours");
          const conseilles: Record<ModeleRelance, boolean> = {
            abonnement_sans_gestion: Boolean(actif) && enCours.length === 0,
            brouillon_a_envoyer: aBrouillon,
            declaration_mois: aEnCours,
            inscrit_sans_abonnement: !actif,
            paiement_refuse: Boolean(actif && actif.statut_paiement && actif.statut_paiement !== "a_jour"),
          };
          const derniere = (m: string) => {
            const r = relances.find((x) => x.modele === m && x.envoye);
            return r ? formatDate(r.envoye_le) : null;
          };
          const destinataire = `${`${compte.prenom} ${compte.nom}`.trim()} <${compte.email}>`;
          return (
            <section className="mt-6 rounded-lg border border-brand-violet/30 p-4" aria-label="Contacter l'abonné">
              <h2 className="font-bold text-brand-violet">Relancer l&apos;abonné par email</h2>
              <p className="mt-1 text-xs text-foreground/60">
                Messages standardisés : le texte exact est affiché avant l&apos;envoi, pour confirmation.
                Les motifs qui correspondent à la situation du compte sont en violet.
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                {MODELES_RELANCE.map((m) => (
                  <BoutonRelance
                    key={m}
                    compteId={id}
                    destinataire={destinataire}
                    modele={m}
                    libelle={contenuRelance(m).bouton}
                    derniere={derniere(m)}
                    className={`btn btn-sm ${conseilles[m] ? "btn-primaire" : "btn-secondaire"}`}
                  />
                ))}
              </div>
              {relances.length > 0 && (
                <details className="mt-3 text-xs">
                  <summary className="text-foreground/70">Historique des relances ({relances.length})</summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {relances.map((r) => (
                      <li key={r.id}>
                        {formatDate(r.envoye_le)} — {r.sujet}
                        {!r.envoye && <span className="text-red-700"> (non envoyé : {r.detail})</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          );
        })()}

        {/* ------------------------------------------------ Abonnement */}
        <section className="mt-8 rounded-lg border border-brand-teal/20 p-5">
          <h2 className="font-bold text-brand-teal">Abonnement</h2>

          {actif ? (
            <>
              <p className="mt-2 text-sm">
                Actif depuis le {formatDate(actif.date_debut)} ·{" "}
                {formatEuros(actif.tarif_mensuel)} / mois · {enCours.length} /{" "}
                {actif.quota_gestions} places utilisées (gestions en cours ou à valider).
              </p>
              {actif.mode_paiement === "systempay" ? (
                <p className="mt-1 text-sm">
                  Payé en ligne · carte {actif.carte_masquee ? `•••• ${actif.carte_masquee.slice(-4)}` : "—"}
                  {actif.carte_expiration ? ` (fin ${formatDate(actif.carte_expiration).slice(3)})` : ""} ·
                  prochain prélèvement le {formatDate(actif.prochaine_echeance)} ·{" "}
                  <span className={actif.statut_paiement === "a_jour" ? "text-brand-teal" : "font-bold text-red-700"}>
                    {actif.statut_paiement === "impaye"
                      ? "impayé"
                      : actif.statut_paiement === "en_retard"
                        ? "échéance refusée, nouvel essai prévu"
                        : "à jour"}
                  </span>
                  <span className="block text-xs text-foreground/60">
                    Modifier le tarif ci-dessous change le montant des prochains prélèvements.
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-foreground/60">
                  Abonnement saisi par l&apos;administration : il n&apos;est pas prélevé par le site.
                </p>
              )}
              {enCours.length > actif.quota_gestions && (
                <p className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
                  Quota dépassé : terminez des gestions ou augmentez le quota. Aucune
                  nouvelle gestion ne peut être validée tant que le dépassement dure.
                </p>
              )}

              <form action={modifierAbonnement} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="compte_id" value={id} />
                <input type="hidden" name="abonnement_id" value={actif.id} />
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Quota de gestions
                  <input
                    type="number"
                    name="quota_gestions"
                    min={1}
                    defaultValue={actif.quota_gestions}
                    className={`${inputClass} w-28`}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Tarif mensuel (€)
                  <input
                    type="text"
                    inputMode="decimal"
                    name="tarif_mensuel"
                    defaultValue={String(actif.tarif_mensuel)}
                    className={`${inputClass} w-28`}
                  />
                </label>
                <BoutonEnvoi className={btnLightClass} enCours="Enregistrement…">
Enregistrer
</BoutonEnvoi>
              </form>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-red-700">
                  Résilier l&apos;abonnement…
                </summary>
                <form action={resilierAbonnement} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="compte_id" value={id} />
                  <input type="hidden" name="abonnement_id" value={actif.id} />
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    Motif (facultatif)
                    <input type="text" name="motif_fin" className={`${inputClass} w-72`} />
                  </label>
                  <BoutonConfirme
                    className={btnDangerClass}
                    enCours="Résiliation…"
                    question="Résilier l'abonnement de ce compte ?"
                    precision="L'abonnement passera en « résilié » à la date du jour. Les gestions en cours ne sont pas arrêtées : terminez-les séparément si besoin."
                    oui="Oui, résilier"
                  >
                    Résilier l&apos;abonnement
                  </BoutonConfirme>
                </form>
                <p className="mt-2 text-xs text-foreground/60">
                  Résilier n&apos;arrête pas les gestions en cours : ce sont
                  deux actions distinctes.
                </p>
              </details>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-foreground/70">
                Aucun abonnement actif pour ce compte.
              </p>
              <form action={creerAbonnement} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="compte_id" value={id} />
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Quota de gestions
                  <input
                    type="number"
                    name="quota_gestions"
                    min={1}
                    defaultValue={4}
                    className={`${inputClass} w-28`}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Tarif mensuel (€)
                  <input
                    type="text"
                    inputMode="decimal"
                    name="tarif_mensuel"
                    defaultValue="12.90"
                    className={`${inputClass} w-28`}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Début
                  <input
                    type="date"
                    name="date_debut"
                    defaultValue={today}
                    className={inputClass}
                  />
                </label>
                <BoutonEnvoi className={btnClass} enCours="Création…">
Créer l&apos;abonnement
</BoutonEnvoi>
              </form>
            </>
          )}

          {anciens.length > 0 && (
            <div className="mt-4 text-xs text-foreground/60">
              Historique :{" "}
              {anciens
                .map(
                  (a) =>
                    `${formatDate(a.date_debut)} → ${formatDate(a.date_fin)}${a.motif_fin ? ` (${a.motif_fin})` : ""}`,
                )
                .join(" ; ")}
            </div>
          )}

          {paiements.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-brand-teal">Derniers paiements</h3>
              <ul className="liste-alternee mt-2 divide-y divide-brand-gray/15 overflow-hidden rounded-lg border border-brand-gray/25 text-xs">
                {paiements.map((p) => (
                  <li key={p.id} className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2">
                    <span className="tabular-nums">{formatDate(p.created_at)}</span>
                    <span className="tabular-nums font-medium">{formatEuros(Number(p.montant))}</span>
                    <span className={p.statut === "PAID" ? "text-brand-teal" : "font-medium text-red-700"}>
                      {p.statut === "PAID" ? "Payé" : `Refusé${p.code_erreur ? ` (${p.code_erreur})` : ""}`}
                    </span>
                    <span className="text-foreground/50">
                      {p.carte_masquee ? `•••• ${String(p.carte_masquee).slice(-4)} · ` : ""}
                      {p.mode === "TEST" ? "test · " : ""}
                      <span className="font-mono">{p.order_id}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* -------------------------------------------------- Gestions */}
        <section className="mt-8">
          <h2 className="font-bold text-brand-teal">Gestions</h2>

          {actif && (
            <form
              action={creerGestion}
              className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-brand-gray/20 p-4"
            >
              <input type="hidden" name="compte_id" value={id} />
              <input type="hidden" name="abonnement_id" value={actif.id} />
              <label className="flex flex-col gap-1 text-xs font-medium">
                Type
                <select name="type_gestion" className={inputClass}>
                  {Object.entries(TYPES_GESTION).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                Prénom du salarié
                <input type="text" name="prenom_salarie" className={`${inputClass} w-36`} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                Nom du salarié
                <input type="text" name="nom_salarie" required className={`${inputClass} w-36`} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                Début
                <input type="date" name="date_debut" defaultValue={today} className={inputClass} />
              </label>
              <BoutonEnvoi className={btnClass} enCours="Création…">
Ajouter la gestion
</BoutonEnvoi>
            </form>
          )}
          {!actif && (
            <p className="mt-2 text-sm text-foreground/70">
              Créez d&apos;abord un abonnement pour pouvoir ajouter des
              gestions.
            </p>
          )}

          {gestions.length === 0 ? (
            <p className="mt-4 text-sm text-foreground/70">Aucune gestion.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {gestions.map((g) => {
                const docsGestion = trierDocuments(
                  documents.filter((d) => d.gestion_id === g.id),
                  "recent",
                );
                // Mois à préremplir dans le dépôt : celui demandé par le lien,
                // sinon la plus ancienne déclaration de l'abonné en attente.
                const enAttente = declarations
                  .filter((d) => d.gestion_id === g.id && d.statut !== "traitee")
                  .sort((a, b) => a.periode.localeCompare(b.periode));
                const cible = depotCible === g.id;
                const avenantsGestion = avenants.filter((a) => a.gestion_id === g.id);
                const avenantsEnAttente = avenantsGestion.filter((a) => a.statut === "envoyee");
                const nbActions =
                  enAttente.length + avenantsEnAttente.length + (g.statut === "envoyee" ? 1 : 0);
                const periodeDepot =
                  cible && periodeCible && /^\d{4}$/.test(periodeCible)
                    ? periodeCible
                    : (enAttente[0]?.periode ?? "");
                // Bulletin corrigé attendu → le dépôt remplacera l'ancien.
                const remplacerDepot =
                  (cible && remplacerCible) ||
                  enAttente.find((d) => d.periode === periodeDepot)?.statut === "modification";
                const titreDepot = `${compte.nom} ${compte.prenom} – ${g.nom_salarie} ${g.prenom_salarie}`
                  .replace(/\s+/g, " ")
                  .trim();
                return (
                  <li
                    key={g.id}
                    id={`gestion-${g.id}`}
                    className="scroll-mt-4 rounded-lg border border-brand-gray/20 bg-[var(--carte)] p-4 transition-shadow has-[>details[open]]:border-brand-violet has-[>details[open]]:bg-white has-[>details[open]]:ring-2 has-[>details[open]]:ring-brand-violet/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm">
                        <span className="mr-2 rounded bg-brand-sky-tint/40 px-1.5 py-0.5 font-mono text-xs text-brand-black">
                          {g.reference}
                        </span>
                        <span className="font-medium">{nomSalarie(g) || "(salarié sans nom)"}</span>
                        <span className="ml-2 text-foreground/60">
                          {TYPES_GESTION[g.type_gestion]} ·{" "}
                          {g.statut === "en_cours"
                            ? `en cours depuis le ${formatDate(g.date_debut)}`
                            : g.statut === "terminee"
                              ? `terminée (${formatDate(g.date_debut)} → ${formatDate(g.date_fin)})`
                              : g.statut === "envoyee"
                                ? `envoyée par l'abonné le ${formatDate(g.envoyee_le)}`
                                : "brouillon de l'abonné (pas encore envoyé)"}
                        </span>
                        {nbActions > 0 && (
                          <span className="ml-2 inline-block rounded-full bg-brand-violet px-2 py-0.5 text-xs font-bold text-white">
                            {g.statut === "envoyee"
                              ? "À valider"
                              : avenantsEnAttente.length && !enAttente.length
                                ? "Avenant demandé"
                                : nbActions === 1
                                  ? "1 action à faire"
                                  : `${nbActions} actions à faire`}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {g.statut === "en_cours" && (
                          <form action={terminerGestion} className="flex items-center gap-2">
                            <input type="hidden" name="compte_id" value={id} />
                            <input type="hidden" name="gestion_id" value={g.id} />
                            <BoutonConfirme
                              className={btnLightClass}
                              enCours="Enregistrement…"
                              question={`Terminer la gestion de ${nomSalarie(g)} ?`}
                              precision="La gestion passera en « terminée » à la date du jour et libérera une place dans le quota de l'abonnement. Les documents restent consultables ; vous pourrez la rouvrir."
                              oui="Oui, terminer"
                            >
                              Terminer la gestion
                            </BoutonConfirme>
                          </form>
                        )}
                        {g.statut === "terminee" && (
                          <form action={rouvrirGestion}>
                            <input type="hidden" name="compte_id" value={id} />
                            <input type="hidden" name="gestion_id" value={g.id} />
                            <BoutonEnvoi className={btnLightClass} enCours="Enregistrement…">
Rouvrir
</BoutonEnvoi>
                          </form>
                        )}
                        {g.statut === "envoyee" && (
                          <form action={validerGestion}>
                            <input type="hidden" name="compte_id" value={id} />
                            <input type="hidden" name="gestion_id" value={g.id} />
                            <BoutonConfirme
                              className={btnClass}
                              enCours="Validation…"
                              question={`Valider la gestion de ${nomSalarie(g)} ?`}
                              precision="Elle passe « en cours » et l'abonné est prévenu (notification et email). Vérifiez avant les informations du contrat dans le détail."
                              oui="Oui, valider"
                            >
                              Valider et démarrer
                            </BoutonConfirme>
                          </form>
                        )}
                        <form action={supprimerGestion}>
                          <input type="hidden" name="compte_id" value={id} />
                          <input type="hidden" name="gestion_id" value={g.id} />
                          <BoutonConfirme
                            className="rounded-full p-2 text-red-700 hover:bg-red-50"
                            enCours="…"
                            libelle={`Supprimer la gestion de ${nomSalarie(g)}`}
                            question={`Supprimer définitivement la gestion de ${nomSalarie(g)} ?`}
                            precision={`Ses ${docsGestion.length} document(s), fichiers PDF compris, et ses déclarations seront effacés. Action irréversible. Pour un salarié qui part, utilisez plutôt « Terminer la gestion ».`}
                            oui="Oui, supprimer"
                          >
                            <IconePoubelle className="h-5 w-5" />
                          </BoutonConfirme>
                        </form>
                      </div>
                    </div>

                    {/* Détail (déclarations + documents + dépôt) : une seule
                        gestion dépliée à la fois grâce à name=… */}
                    <details
                      name="gestions-du-compte"
                      className="mt-3"
                      open={gestionOuverte === g.id}
                    >
                      <summary className="text-sm font-medium text-brand-teal">
                        Détail : {docsGestion.length} document(s)
                        {enAttente.length > 0 && (
                          <span className="text-brand-violet">
                            {" "}· {enAttente.length} déclaration(s) à traiter
                          </span>
                        )}
                        {avenantsEnAttente.length > 0 && (
                          <span className="text-brand-violet"> · avenant demandé</span>
                        )}
                      </summary>

                      {avenantsGestion.length > 0 && (
                        <section className="mt-3" aria-label="Demandes d'avenant">
                          <h3 className="text-sm font-bold text-brand-violet">Demandes d&apos;avenant</h3>
                          <ul className="mt-1 divide-y divide-brand-gray/15 text-sm">
                            {avenantsGestion.map((a) => (
                              <li key={a.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-4">
                                <span className="flex-1">
                                  <span className="font-medium">
                                    {a.objets.map((o) => OBJETS_AVENANT[o] ?? o).join(" · ")}
                                  </span>
                                  {a.date_effet && (
                                    <span className="text-foreground/70"> — à partir du {formatDate(a.date_effet)}</span>
                                  )}
                                  <span className="block text-foreground/70">« {a.description} »</span>
                                </span>
                                <span className="flex shrink-0 flex-col items-start gap-1 text-xs sm:items-end">
                                  {a.statut === "envoyee" ? (
                                    <>
                                      <span className="font-semibold text-brand-violet">
                                        à traiter (demandée le {formatDate(a.created_at)})
                                      </span>
                                      <Link
                                        href={`/admin/comptes/${id}?depot=${g.id}&type=avenant${a.date_effet ? `&periode=${a.date_effet.slice(2, 4)}${a.date_effet.slice(5, 7)}` : ""}#depot-${g.id}`}
                                        className="btn btn-primaire btn-sm"
                                      >
                                        Déposer l&apos;avenant
                                      </Link>
                                      <CloreDemande
                                        action={marquerAvenantTraite}
                                        champs={{ compte_id: id, demande_id: a.id }}
                                        libelle="Marquer comme traitée sans document…"
                                        bouton="Marquer comme traitée"
                                        aide="La demande est faite (ex. avenant envoyé par courrier) : l'abonné est prévenu."
                                      />
                                      <CloreDemande
                                        action={cloreAvenant}
                                        champs={{ compte_id: id, demande_id: a.id }}
                                        libelle="Clore sans avenant…"
                                        bouton="Clore la demande"
                                        aide="Aucun avenant ne sera établi (demande sans objet, réglée par téléphone…). L'abonné est prévenu, avec votre commentaire."
                                      />
                                    </>
                                  ) : (
                                    <span className="text-foreground/50">
                                      {a.statut === "close" ? "close sans avenant" : "traitée"} le {formatDate(a.traitee_le)}
                                      {a.reponse_admin ? ` — « ${a.reponse_admin} »` : ""}
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {(g.type_contrat || g.statut === "brouillon" || g.statut === "envoyee" || g.statut === "en_cours") && (
                        <section className="mt-3 rounded-lg bg-[var(--carte)] p-3" aria-label="Informations du contrat">
                          <h3 className="mb-2 text-sm font-bold text-brand-teal">Informations du contrat</h3>
                          <RecapGestion gestion={g} />
                          {(g.statut === "en_cours" || g.statut === "terminee") && (
                            <ContratAdmin compteId={id} gestion={g} />
                          )}
                          {g.motif_retour && g.statut === "brouillon" && (
                            <p className="mt-2 text-xs text-foreground/70">
                              Renvoyée à l&apos;abonné : « {g.motif_retour} »
                            </p>
                          )}
                          {g.statut === "envoyee" && (
                            <details className="mt-3">
                              <summary className="text-sm font-medium text-brand-violet">
                                Renvoyer à l&apos;abonné pour qu&apos;il complète…
                              </summary>
                              <form action={renvoyerGestion} className="mt-2 flex flex-col gap-2">
                                <input type="hidden" name="compte_id" value={id} />
                                <input type="hidden" name="gestion_id" value={g.id} />
                                <textarea
                                  name="motif_retour"
                                  required
                                  minLength={3}
                                  rows={2}
                                  placeholder="ex. merci de préciser les horaires et le nombre d'enfants gardés"
                                  className={`${inputClass} w-full`}
                                />
                                <BoutonEnvoi className={`${btnLightClass} self-start`} enCours="Envoi…">
                                  Renvoyer à l&apos;abonné
                                </BoutonEnvoi>
                              </form>
                            </details>
                          )}
                        </section>
                      )}

                      {declarations.some((d) => d.gestion_id === g.id) && (
                        <section className="mt-3" aria-label="Déclarations de l'abonné">
                          <h3 className="text-sm font-bold text-brand-violet">
                            Déclarations de l&apos;abonné
                          </h3>
                          <ul className="mt-2 divide-y divide-brand-gray/15 text-sm">
                            {declarations
                              .filter((d) => d.gestion_id === g.id)
                              .map((d) => (
                                <li key={d.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
                                  <span className="w-32 shrink-0">{libelleMois(d.periode)}</span>
                                  <span className="w-20 shrink-0 tabular-nums">{formatHeures(d.heures)}</span>
                                  <span className="min-w-0 flex-1 text-foreground/70">{d.commentaire || "—"}</span>
                                  <span className={`shrink-0 text-xs ${d.statut === "envoyee" || d.statut === "modification" ? "font-semibold text-brand-violet" : "text-foreground/50"}`}>
                                    {d.statut === "envoyee"
                                      ? `à traiter (envoyée le ${formatDate(d.envoyee_le)})`
                                      : d.statut === "modification"
                                        ? `modification demandée le ${formatDate(d.modification_demandee_le)} : « ${d.motif_modification ?? ""} »`
                                        : d.statut === "close"
                                          ? `close sans bulletin le ${formatDate(d.cloturee_le)}`
                                          : `traitée le ${formatDate(d.traitee_le)}${d.cloturee_le ? ` · modification refusée le ${formatDate(d.cloturee_le)}` : ""}`}
                                    {d.reponse_admin ? ` — « ${d.reponse_admin} »` : ""}
                                  </span>
                                  {(d.statut === "envoyee" || d.statut === "modification") && (
                                    <span className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
                                      <Link
                                        href={`/admin/comptes/${id}?depot=${g.id}&periode=${d.periode}${d.statut === "modification" ? "&remplacer=1" : ""}#depot-${g.id}`}
                                        className="btn btn-primaire btn-sm shrink-0"
                                      >
                                        {d.statut === "modification" ? "Déposer le bulletin corrigé" : "Déposer le bulletin"}
                                      </Link>
                                      <CloreDemande
                                        action={cloreDeclaration}
                                        champs={{ compte_id: id, declaration_id: d.id }}
                                        libelle={d.statut === "modification" ? "Refuser la modification…" : "Clore sans bulletin…"}
                                        bouton={d.statut === "modification" ? "Refuser la modification" : "Clore la déclaration"}
                                        aide={
                                          d.statut === "modification"
                                            ? "Le bulletin en ligne est maintenu tel quel. L'abonné est prévenu, avec votre commentaire."
                                            : "Aucun bulletin ne sera établi pour ce mois (doublon, mois sans travail…). L'abonné est prévenu, avec votre commentaire."
                                        }
                                      />
                                    </span>
                                  )}
                                </li>
                              ))}
                          </ul>
                        </section>
                      )}

                      <DocumentsGestion compteId={id} documents={docsGestion} />
                      <div id={`depot-${g.id}`} className="scroll-mt-4">
                        <DepotDocument
                          key={`${g.id}-${periodeDepot}-${cible ? typeCible : "bulletin"}`}
                          compteId={id}
                          gestionId={g.id}
                          typeInitial={cible ? typeCible : "bulletin"}
                          periodeInitiale={periodeDepot}
                          titreInitial={titreDepot}
                          remplacerInitial={remplacerDepot}
                        />
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
