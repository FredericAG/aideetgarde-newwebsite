import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDate, formatEuros, type Abonnement } from "@/lib/data";
import { LIBELLES_STATUT_PAIEMENT } from "@/lib/formules";
import { configSystempay } from "@/lib/systempay";
import { Regularisation, Souscription } from "./Paiement";
import { annulerMaResiliation, exercerMaRetractation, resilierMonAbonnement } from "./actions";
import { BoutonConfirme } from "@/components/BoutonConfirme";

export const metadata = { title: "Mon abonnement — Aide & Garde" };

/**
 * Dernier jour du délai de rétractation (14 jours après la souscription en
 * ligne), au format AAAA-MM-JJ, ou null s'il est dépassé (heure de Paris).
 */
function limiteRetractation(dateDebut: string | null | undefined): string | null {
  if (!dateDebut) return null;
  const limite = new Date(`${dateDebut.slice(0, 10)}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + 14);
  const iso = limite.toISOString().slice(0, 10);
  const aujourdhui = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
  return aujourdhui <= iso ? iso : null;
}

const MESSAGES_COMMANDE: Record<string, { texte: string; ok: boolean }> = {
  payee: { texte: "Paiement accepté : votre abonnement est à jour. Merci !", ok: true },
  en_attente: {
    texte: "Paiement en cours de confirmation par la banque. Rechargez la page dans un instant.",
    ok: true,
  },
  refusee: {
    texte: "Le paiement a été refusé. Vous pouvez réessayer, avec la même carte ou une autre.",
    ok: false,
  },
  abandonnee: { texte: "Le paiement n'a pas été finalisé. Vous pouvez recommencer.", ok: false },
  a_verifier: {
    texte: "Votre paiement est bien reçu ; Aide & Garde le vérifie et revient vers vous rapidement.",
    ok: true,
  },
};

/** Dernier jour du mois en cours (heure de Paris), au format 31/10/2026. */
function finDuMois(): string {
  const [a, m] = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  const dernier = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${String(dernier).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

/** Dernier jour du mois en cours (heure de Paris), au format 2026-10-31. */
function finDuMoisIso(): string {
  const [j, m, a] = finDuMois().split("/");
  return `${a}-${m}-${j}`;
}

/**
 * Le mois de résiliation reste dû (décision du 21/10) : phrase qui dit si un
 * dernier prélèvement aura lieu avant la date de fin.
 */
function phraseDernierPrelevement(abo: Abonnement, finIso: string): string {
  if (abo.mode_paiement !== "systempay") return "Le mois en cours reste dû.";
  if (abo.prochaine_echeance && abo.prochaine_echeance <= finIso) {
    return `Le mois en cours reste dû : un dernier prélèvement de ${formatEuros(abo.tarif_mensuel)} aura lieu le ${formatDate(abo.prochaine_echeance)}, puis plus aucun.`;
  }
  return "Le mois en cours est déjà réglé : aucun autre prélèvement ne sera effectué.";
}

/** "497010XXXXXX0055" → "•••• 0055". */
function carteLisible(c: string | null | undefined): string {
  if (!c) return "—";
  return `•••• ${c.slice(-4)}`;
}

/**
 * Abonnement de l'abonné (brique 5a) : souscription en ligne, carte
 * enregistrée, prochaine échéance, règlement d'une échéance impayée et
 * historique des paiements.
 */
export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const commandeRetour = Array.isArray(sp.commande) ? sp.commande[0] : sp.commande;
  const messageOk = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const messageErreur = Array.isArray(sp.erreur) ? sp.erreur[0] : sp.erreur;
  const { supabase, user, profile } = await requireUser("/tableau-de-bord/abonnement");
  if (profile?.role === "admin") redirect("/admin/abonnements");

  const config = configSystempay();

  const [aboRes, placesRes, echeancesRes, paiementsRes, commandeRes] = await Promise.all([
    supabase
      .from("abonnements")
      .select("*")
      .eq("employeur_id", user.id)
      .eq("statut", "actif")
      .maybeSingle(),
    supabase
      .from("gestions")
      .select("id", { count: "exact", head: true })
      .eq("employeur_id", user.id)
      .in("statut", ["envoyee", "en_cours"])
      .is("remplace_gestion_id", null),
    supabase
      .from("echeances")
      .select("id, date_echeance, montant, statut, tentatives, prochaine_tentative")
      .eq("employeur_id", user.id)
      .in("statut", ["a_payer", "impayee"])
      .order("date_echeance"),
    supabase
      .from("paiements")
      .select("id, created_at, montant, statut, carte_masquee, echeance_id, commande_id, mode")
      .eq("employeur_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24),
    commandeRetour
      ? supabase
          .from("commandes")
          .select("statut")
          .eq("order_id", commandeRetour)
          .eq("employeur_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const abonnement = aboRes.data as Abonnement | null;
  const placesUtilisees = placesRes.count ?? 0;
  // echeancesRes/paiementsRes en erreur = script brique5a pas encore exécuté.
  const enDefaut = (echeancesRes.data ?? []).filter(
    (e) => e.statut === "impayee" || (e.statut === "a_payer" && e.tentatives > 0),
  );
  const paiements = paiementsRes.data ?? [];
  const message = commandeRes.data ? MESSAGES_COMMANDE[commandeRes.data.statut as string] : null;

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Mon abonnement</h1>

        {config?.mode === "TEST" && (
          <div className="mt-6 rounded-lg border-2 border-dashed border-brand-violet bg-white p-3 text-sm">
            <strong className="text-brand-violet">Mode test</strong> : aucune carte réelle n&apos;est
            débitée. Cartes de test (date d&apos;expiration future et code quelconques) :{" "}
            <code>4970 1000 0000 0055</code> acceptée, <code>4970 1000 0000 0113</code> refusée,{" "}
            <code>4970 1000 0000 0675</code> acceptée maintenant mais refusée aux échéances suivantes.
          </div>
        )}

        {message && (
          <p
            role="status"
            className={`mt-6 rounded-lg border p-3 text-sm ${
              message.ok
                ? "border-brand-teal/40 bg-brand-teal/10 text-brand-teal"
                : "border-red-300 bg-red-50 text-red-700"
            }`}
          >
            {message.texte}
          </p>
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

        {/* --- Échéance à régulariser --- */}
        {abonnement && enDefaut.length > 0 && (
          <section className="mt-8 rounded-xl border-2 border-red-300 bg-red-50 p-5">
            <h2 className="font-bold text-red-700">
              {enDefaut.some((e) => e.statut === "impayee")
                ? "Échéance impayée"
                : "Prélèvement refusé"}
            </h2>
            {enDefaut.map((e) => (
              <div key={e.id} className="mt-3 text-sm">
                <p>
                  Échéance du {formatDate(e.date_echeance)} : {formatEuros(e.montant)}, refusée{" "}
                  {e.tentatives} fois par la banque.
                  {e.statut === "a_payer" &&
                    ` Nouvel essai automatique le ${formatDate(e.prochaine_tentative)}.`}
                </p>
                {config && (
                  <Regularisation
                    clePublique={config.clePublique}
                    echeanceId={e.id}
                    montant={Number(e.montant)}
                  />
                )}
              </div>
            ))}
            <p className="mt-3 text-xs text-foreground/70">
              La carte utilisée sera enregistrée pour les prochains mois.
            </p>
          </section>
        )}

        {/* --- Abonnement en cours --- */}
        {abonnement ? (
          <section className="carte mt-8 p-5">
            <h2 className="font-bold text-brand-teal">Votre formule</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-foreground/60">Salariés suivis</dt>
                <dd className="font-medium">
                  {placesUtilisees} / {abonnement.quota_gestions}
                </dd>
              </div>
              <div>
                <dt className="text-foreground/60">Tarif mensuel</dt>
                <dd className="font-medium">{formatEuros(abonnement.tarif_mensuel)}</dd>
              </div>
              <div>
                <dt className="text-foreground/60">Depuis le</dt>
                <dd className="font-medium">{formatDate(abonnement.date_debut)}</dd>
              </div>
              {abonnement.mode_paiement === "systempay" ? (
                <>
                  <div>
                    <dt className="text-foreground/60">Carte enregistrée</dt>
                    <dd className="font-medium">
                      {carteLisible(abonnement.carte_masquee)}
                      {abonnement.carte_expiration && (
                        <span className="font-normal text-foreground/60">
                          {" "}
                          · expire {formatDate(abonnement.carte_expiration).slice(3)}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/60">Prochain prélèvement</dt>
                    <dd className="font-medium">
                      {abonnement.fin_prevue &&
                      (!abonnement.prochaine_echeance || abonnement.prochaine_echeance > abonnement.fin_prevue)
                        ? "aucun (résiliation)"
                        : `${formatDate(abonnement.prochaine_echeance)}${abonnement.fin_prevue ? " (dernier)" : ""}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/60">Paiements</dt>
                    <dd
                      className={`font-medium ${
                        abonnement.statut_paiement === "a_jour" ? "text-brand-teal" : "text-red-700"
                      }`}
                    >
                      {LIBELLES_STATUT_PAIEMENT[abonnement.statut_paiement ?? "a_jour"]}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="col-span-2 sm:col-span-3 text-foreground/70">
                  Le règlement de cet abonnement est suivi directement par Aide &amp; Garde.
                </div>
              )}
            </dl>
            <p className="mt-4 text-xs text-foreground/60">
              Pour changer de formule, contactez-nous (cette démarche en ligne arrive prochainement).
            </p>
          </section>
        ) : null}

        {/* --- Rétractation en ligne (14 jours après une souscription en ligne,
            obligatoire depuis le 19/06/2026 : « Renoncer au contrat ici »). --- */}
        {abonnement && abonnement.statut === "actif" && abonnement.mode_paiement === "systempay" && limiteRetractation(abonnement.date_debut) && (
          <section id="renoncer" className="mt-6 scroll-mt-4 rounded-xl border border-brand-gray/25 bg-white p-5 text-sm">
            <h2 className="font-bold text-brand-teal">Droit de rétractation</h2>
            <p className="mt-1 text-foreground/70">
              Vous avez souscrit en ligne le {formatDate(abonnement.date_debut)} : vous pouvez renoncer à
              votre contrat jusqu&apos;au {formatDate(limiteRetractation(abonnement.date_debut))} inclus, sans
              avoir à vous justifier. L&apos;abonnement prend fin le jour même et vous êtes remboursé sous 14
              jours, moins le service déjà fourni.
            </p>
            <details className="mt-3">
              <summary className="btn btn-secondaire btn-sm cursor-pointer list-none">Renoncer au contrat ici</summary>
              <form action={exercerMaRetractation} className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Nom
                  <input name="nom" required defaultValue={profile?.nom ?? ""} autoComplete="family-name" className="rounded-md border border-brand-gray/40 px-2 py-1.5 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Prénom
                  <input name="prenom" required defaultValue={profile?.prenom ?? ""} autoComplete="given-name" className="rounded-md border border-brand-gray/40 px-2 py-1.5 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
                  Email pour recevoir l&apos;accusé de réception
                  <input name="email" type="email" required defaultValue={user.email ?? ""} autoComplete="email" className="rounded-md border border-brand-gray/40 px-2 py-1.5 text-sm" />
                </label>
                <p className="text-xs text-foreground/60 sm:col-span-2">
                  Contrat concerné : abonnement Aide &amp; Garde souscrit le {formatDate(abonnement.date_debut)} ({formatEuros(abonnement.tarif_mensuel)} par mois).
                </p>
                <div className="sm:col-span-2">
                  <button type="submit" className="btn btn-danger btn-sm">
                    Confirmer la rétractation
                  </button>
                </div>
              </form>
            </details>
          </section>
        )}

        {/* --- Résiliation (brique 5b) --- */}
        {abonnement ? (
          abonnement.fin_prevue ? (
            <section className="mt-6 rounded-xl border-2 border-brand-jaune bg-brand-jaune/25 p-5 text-sm">
              <h2 className="font-bold text-brand-black">Résiliation demandée</h2>
              <p className="mt-1">
                Demandée le {formatDate(abonnement.resiliation_demandee_le)} : votre abonnement reste
                actif jusqu&apos;au <strong>{formatDate(abonnement.fin_prevue)}</strong> inclus, puis
                prend fin. {phraseDernierPrelevement(abonnement, abonnement.fin_prevue)} Vos documents
                restent consultables ensuite.
              </p>
              <form action={annulerMaResiliation} className="mt-3">
                <BoutonConfirme
                  className="btn btn-secondaire btn-sm"
                  question="Annuler la résiliation ?"
                  precision="Votre abonnement continuera normalement, avec ses prélèvements mensuels."
                  oui="Oui, garder mon abonnement"
                  enCours="Enregistrement…"
                >
                  Annuler la résiliation
                </BoutonConfirme>
              </form>
            </section>
          ) : (
            <section className="mt-6 rounded-xl border border-brand-gray/25 bg-white p-5 text-sm">
              <h2 id="resilier" className="scroll-mt-4 font-bold text-brand-teal">Résilier mon abonnement</h2>
              <p className="mt-1 text-foreground/70">
                La résiliation prend effet à la fin du mois en cours, le {finDuMois()}. Jusque-là, vous
                gardez l&apos;accès à tous les services ; vos documents restent ensuite consultables.
                Résilier ne termine pas les gestions de vos salariés : pensez à nous signaler une fin
                de contrat.
              </p>
              <form action={resilierMonAbonnement} className="mt-3">
                <BoutonConfirme
                  className="btn btn-danger btn-sm"
                  question="Résilier votre abonnement ?"
                  precision={`La résiliation prendra effet à la fin du mois en cours, le ${finDuMois()}. ${phraseDernierPrelevement(abonnement, finDuMoisIso())} Vous pourrez annuler votre demande d'ici là.`}
                  oui="Oui, résilier"
                  enCours="Enregistrement…"
                >
                  Résilier mon abonnement
                </BoutonConfirme>
              </form>
            </section>
          )
        ) : (
          <section className="carte mt-8 p-5">
            <h2 className="font-bold text-brand-teal">Choisir ma formule</h2>
            {config ? (
              <Souscription clePublique={config.clePublique} placesUtilisees={placesUtilisees} />
            ) : (
              <p className="mt-3 text-sm text-foreground/70">
                La souscription en ligne n&apos;est pas encore ouverte.{" "}
                <Link href="/aide" className="text-brand-teal underline">
                  Contactez-nous
                </Link>{" "}
                pour vous abonner.
              </p>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-foreground/60">
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Paiement sécurisé par Systempay, avec notre banque (BRED). Votre numéro de carte
              n&apos;est jamais transmis à Aide &amp; Garde.
            </p>
          </section>
        )}

        {/* --- Historique --- */}
        {paiements.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-brand-teal">Historique des paiements</h2>
            <ul className="liste-alternee mt-3 divide-y divide-brand-gray/15 overflow-hidden rounded-xl border border-brand-gray/25 bg-white text-sm">
              {paiements.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <span className="min-w-28">{formatDate(p.created_at)}</span>
                  <span className="flex-1 text-foreground/70">
                    {p.echeance_id && !p.commande_id ? "Échéance mensuelle" : p.commande_id && p.echeance_id ? "Règlement d'échéance" : "Premier mois"}
                    {p.carte_masquee ? ` · ${carteLisible(p.carte_masquee)}` : ""}
                    {p.mode === "TEST" ? " · test" : ""}
                  </span>
                  <span className="whitespace-nowrap font-medium">{formatEuros(p.montant)}</span>
                  <span
                    className={`w-20 text-right font-medium ${
                      p.statut === "PAID" ? "text-brand-teal" : "text-red-700"
                    }`}
                  >
                    {p.statut === "PAID" ? "Payé" : "Refusé"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
