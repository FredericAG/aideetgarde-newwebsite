import Link from "next/link";
import { TitreDocument } from "@/components/TitreDocument";
import { DepotDocument } from "./DepotDocument";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  TYPES_DOCUMENT,
  TYPES_GESTION,
  formatDate,
  formatEuros,
  formatPeriode,
  isUuid,
  nomSalarie,
  type Abonnement,
  type DocumentRow,
  type Gestion,
} from "@/lib/data";
import {
  creerAbonnement,
  creerGestion,
  modifierAbonnement,
  resilierAbonnement,
  rouvrirGestion,
  supprimerDocument,
  supprimerGestion,
  terminerGestion,
} from "./actions";

const inputClass =
  "rounded-md border border-brand-gray/40 bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-teal";
const btnClass =
  "rounded-md bg-brand-violet px-3 py-1.5 text-sm font-semibold text-white";
const btnLightClass =
  "rounded-md border border-brand-gray/40 px-3 py-1.5 text-sm font-medium";
const btnDangerClass =
  "rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700";

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

  const { supabase } = await requireAdmin(`/admin/comptes/${id}`);

  const { data: compte } = await supabase
    .from("profiles")
    .select(
      "id, email, role, prenom, nom, telephone, adresse, code_postal, ville, created_at",
    )
    .eq("id", id)
    .maybeSingle<CompteRow>();
  if (!compte) notFound();

  const [abosRes, gestionsRes, docsRes] = await Promise.all([
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
      .select("id, gestion_id, type_document, periode, titre, storage_path, created_at")
      .eq("employeur_id", id)
      .order("periode", { ascending: false, nullsFirst: false }),
  ]);

  const abonnements = (abosRes.data ?? []) as Abonnement[];
  const gestions = (gestionsRes.data ?? []) as Gestion[];
  const documents = (docsRes.data ?? []) as DocumentRow[];

  const actif = abonnements.find((a) => a.statut === "actif") ?? null;
  const anciens = abonnements.filter((a) => a.statut !== "actif");
  const enCours = gestions.filter((g) => g.statut === "en_cours");
  const today = new Date().toISOString().slice(0, 10);

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
                <button type="submit" className={btnLightClass}>
                  Enregistrer
                </button>
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
                  <button type="submit" className={btnDangerClass}>
                    Confirmer la résiliation
                  </button>
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
                <button type="submit" className={btnClass}>
                  Créer l&apos;abonnement
                </button>
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
              <button type="submit" className={btnClass}>
                Ajouter la gestion
              </button>
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
                const docsGestion = documents.filter((d) => d.gestion_id === g.id);
                return (
                  <li key={g.id} className="rounded-lg border border-brand-gray/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm">
                        <span className="font-medium">{nomSalarie(g)}</span>
                        <span className="ml-2 text-foreground/60">
                          {TYPES_GESTION[g.type_gestion]} ·{" "}
                          {g.statut === "en_cours"
                            ? `en cours depuis le ${formatDate(g.date_debut)}`
                            : `terminée (${formatDate(g.date_debut)} → ${formatDate(g.date_fin)})`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {g.statut === "en_cours" ? (
                          <form action={terminerGestion} className="flex items-center gap-2">
                            <input type="hidden" name="compte_id" value={id} />
                            <input type="hidden" name="gestion_id" value={g.id} />
                            <input type="date" name="date_fin" defaultValue={today} className={inputClass} />
                            <button type="submit" className={btnLightClass}>
                              Terminer la gestion
                            </button>
                          </form>
                        ) : (
                          <form action={rouvrirGestion}>
                            <input type="hidden" name="compte_id" value={id} />
                            <input type="hidden" name="gestion_id" value={g.id} />
                            <button type="submit" className={btnLightClass}>
                              Rouvrir
                            </button>
                          </form>
                        )}
                        <details>
                          <summary className="cursor-pointer text-xs text-red-700">
                            Supprimer…
                          </summary>
                          <form action={supprimerGestion} className="mt-2">
                            <input type="hidden" name="compte_id" value={id} />
                            <input type="hidden" name="gestion_id" value={g.id} />
                            <button type="submit" className={btnDangerClass}>
                              Supprimer définitivement
                            </button>
                          </form>
                        </details>
                      </div>
                    </div>

                    {/* Documents de la gestion */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-brand-teal">
                        Documents ({docsGestion.length})
                      </summary>
                      <ul className="mt-2 divide-y divide-brand-gray/15 text-sm">
                        {docsGestion.map((d) => (
                          <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                            <span>
                              <TitreDocument doc={d} />
                              <span className="ml-2 text-foreground/60">
                                {TYPES_DOCUMENT[d.type_document]}
                                {d.periode ? ` · ${formatPeriode(d.periode)}` : ""}
                              </span>
                            </span>
                            <form action={supprimerDocument}>
                              <input type="hidden" name="compte_id" value={id} />
                              <input type="hidden" name="document_id" value={d.id} />
                              <button type="submit" className="text-xs text-red-700 underline">
                                Supprimer
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                      <DepotDocument compteId={id} gestionId={g.id} />
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
