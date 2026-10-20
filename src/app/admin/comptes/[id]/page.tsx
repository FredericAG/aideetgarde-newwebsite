import Link from "next/link";
import { DocumentsGestion } from "./DocumentsGestion";
import { DepotDocument } from "./DepotDocument";
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
  isUuid,
  libelleMois,
  nomSalarie,
  trierDocuments,
  type Abonnement,
  type Declaration,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";
import {
  creerAbonnement,
  creerGestion,
  modifierAbonnement,
  resilierAbonnement,
  rouvrirGestion,
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

  const { supabase } = await requireAdmin(`/admin/comptes/${id}`);

  // Toutes les lectures partent en même temps (un seul aller-retour réseau
  // au lieu de deux à la suite).
  const [compteRes, abosRes, gestionsRes, docsRes, declsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, role, prenom, nom, telephone, adresse, code_postal, ville, created_at",
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
      .select("id, gestion_id, periode, heures, commentaire, statut, envoyee_le, traitee_le, motif_modification, modification_demandee_le")
      .eq("employeur_id", id)
      .order("periode", { ascending: false }),
  ]);
  const declarations = (declsRes.data ?? []) as Declaration[];

  const compte = compteRes.data;
  if (!compte) notFound();

  const abonnements = (abosRes.data ?? []) as Abonnement[];
  const gestions = (gestionsRes.data ?? []) as Gestion[];
  const documents = (docsRes.data ?? []) as DocumentRow[];

  const actif = abonnements.find((a) => a.statut === "actif") ?? null;
  const anciens = abonnements.filter((a) => a.statut !== "actif");
  const enCours = gestions.filter((g) => g.statut === "en_cours");
  const today = new Date().toISOString().slice(0, 10);
  // Une seule gestion dépliée à la fois (les autres gardent un cadre gris
  // clair) : celle visée par le lien « Déposer le bulletin », sinon la
  // première qui attend une action.
  const gestionOuverte =
    (depotCible && gestions.some((g) => g.id === depotCible) ? depotCible : null) ??
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
          {compte.email} · rôle : {compte.role} · inscrit le{" "}
          {formatDate(compte.created_at)}
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

        {/* ------------------------------------------------ Abonnement */}
        <section className="mt-8 rounded-lg border border-brand-teal/20 p-5">
          <h2 className="font-bold text-brand-teal">Abonnement</h2>

          {actif ? (
            <>
              <p className="mt-2 text-sm">
                Actif depuis le {formatDate(actif.date_debut)} ·{" "}
                {formatEuros(actif.tarif_mensuel)} / mois · {enCours.length} /{" "}
                {actif.quota_gestions} gestions en cours.
              </p>

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
                    className="scroll-mt-4 rounded-lg border border-brand-gray/20 p-4 transition-shadow has-[>details[open]]:border-brand-violet has-[>details[open]]:ring-2 has-[>details[open]]:ring-brand-violet/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm">
                        <span className="mr-2 rounded bg-brand-sky-tint/40 px-1.5 py-0.5 font-mono text-xs text-brand-black">
                          {g.reference}
                        </span>
                        <span className="font-medium">{nomSalarie(g)}</span>
                        <span className="ml-2 text-foreground/60">
                          {TYPES_GESTION[g.type_gestion]} ·{" "}
                          {g.statut === "en_cours"
                            ? `en cours depuis le ${formatDate(g.date_debut)}`
                            : `terminée (${formatDate(g.date_debut)} → ${formatDate(g.date_fin)})`}
                        </span>
                        {enAttente.length > 0 && (
                          <span className="ml-2 inline-block rounded-full bg-brand-violet px-2 py-0.5 text-xs font-bold text-white">
                            {enAttente.length === 1
                              ? "1 action à faire"
                              : `${enAttente.length} actions à faire`}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {g.statut === "en_cours" ? (
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
                        ) : (
                          <form action={rouvrirGestion}>
                            <input type="hidden" name="compte_id" value={id} />
                            <input type="hidden" name="gestion_id" value={g.id} />
                            <BoutonEnvoi className={btnLightClass} enCours="Enregistrement…">
Rouvrir
</BoutonEnvoi>
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
                      </summary>

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
                                  <span className={`shrink-0 text-xs ${d.statut !== "traitee" ? "font-semibold text-brand-violet" : "text-foreground/50"}`}>
                                    {d.statut === "envoyee"
                                      ? `à traiter (envoyée le ${formatDate(d.envoyee_le)})`
                                      : d.statut === "modification"
                                        ? `modification demandée le ${formatDate(d.modification_demandee_le)} : « ${d.motif_modification ?? ""} »`
                                        : `traitée le ${formatDate(d.traitee_le)}`}
                                  </span>
                                  {d.statut !== "traitee" && (
                                    <Link
                                      href={`/admin/comptes/${id}?depot=${g.id}&periode=${d.periode}${d.statut === "modification" ? "&remplacer=1" : ""}#depot-${g.id}`}
                                      className="btn btn-primaire btn-sm shrink-0"
                                    >
                                      {d.statut === "modification" ? "Déposer le bulletin corrigé" : "Déposer le bulletin"}
                                    </Link>
                                  )}
                                </li>
                              ))}
                          </ul>
                        </section>
                      )}

                      <DocumentsGestion compteId={id} documents={docsGestion} />
                      <div id={`depot-${g.id}`} className="scroll-mt-4">
                        <DepotDocument
                          key={`${g.id}-${periodeDepot}`}
                          compteId={id}
                          gestionId={g.id}
                          typeInitial="bulletin"
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
