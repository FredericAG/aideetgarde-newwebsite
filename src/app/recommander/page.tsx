import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { adresseSite } from "@/lib/email";
import { formatDate } from "@/lib/data";
import { FormulaireRecommandation } from "./FormulaireRecommandation";

export const metadata: Metadata = {
  title: "Parrainer un proche — Aide & Garde",
  robots: { index: false, follow: false },
};

/**
 * Parrainage (décision du 13/11/2026) : un mois offert au filleul et un au
 * parrain, une fois le premier mois du filleul payé et son délai de
 * rétractation passé (script brique14).
 */
export default async function RecommanderPage() {
  const { supabase, user } = await requireUser("/recommander");
  const [{ data: moi }, { data: parrainages }, { data: abo }, site] = await Promise.all([
    supabase.from("profiles").select("code_parrainage").eq("id", user.id).maybeSingle(),
    supabase.from("parrainages").select("accorde_le, parrain_credite").eq("parrain_id", user.id).order("accorde_le", { ascending: false }),
    supabase.from("abonnements").select("mois_offerts").eq("employeur_id", user.id).eq("statut", "actif").maybeSingle(),
    adresseSite(),
  ]);
  const code = (moi?.code_parrainage as string | null) ?? null;
  const lien = code ? `${site}/inscription?parrain=${code}` : "";
  const accordes = (parrainages ?? []) as { accorde_le: string; parrain_credite: boolean }[];
  const moisOfferts = Number(abo?.mois_offerts ?? 0);

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-2xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Parrainer un proche</h1>
        <p className="mt-2 text-sm text-foreground/75">
          Un proche emploie quelqu&apos;un à domicile, ou s&apos;apprête à le faire ? Envoyez-lui votre lien :{" "}
          <strong>un mois offert pour lui, et un pour vous</strong>, dès que son premier mois est réglé.
        </p>

        <div className="carte mt-6 p-5">
          {code ? (
            <FormulaireRecommandation lien={lien} code={code} />
          ) : (
            <p className="text-sm text-foreground/70">Votre lien de parrainage sera bientôt disponible.</p>
          )}
        </div>

        <section className="mt-6 text-sm" aria-labelledby="titre-suivi">
          <h2 id="titre-suivi" className="font-bold text-brand-teal">
            Vos parrainages
          </h2>
          {accordes.length === 0 ? (
            <p className="mt-1 text-foreground/70">Aucun pour l&apos;instant.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {accordes.map((p) => (
                <li key={p.accorde_le}>
                  {formatDate(p.accorde_le)} : {p.parrain_credite ? "un mois offert sur votre abonnement" : "parrainage enregistré (sans abonnement actif ce jour-là, pas de mois offert)"}
                </li>
              ))}
            </ul>
          )}
          {moisOfferts > 0 && (
            <p className="mt-2 font-medium text-brand-teal">
              {moisOfferts} mois offert{moisOfferts > 1 ? "s" : ""} à venir : {moisOfferts > 1 ? "vos prochains prélèvements ne seront pas faits" : "votre prochain prélèvement ne sera pas fait"}.
            </p>
          )}
        </section>

        <section className="mt-6 text-xs text-foreground/65" aria-labelledby="titre-conditions">
          <h2 id="titre-conditions" className="font-bold">
            Conditions
          </h2>
          <ul className="mt-1 list-disc pl-5">
            <li>Votre proche s&apos;inscrit avec votre lien ou votre code, puis souscrit une formule.</li>
            <li>
              Une fois son premier mois réglé et son délai de rétractation de 14 jours écoulé, son prochain mois est
              offert, et le vôtre aussi si votre abonnement est actif.
            </li>
            <li>12 mois offerts au plus par an et par parrain. Un mois offert n&apos;est ni remboursable ni convertible.</li>
            <li>Les sommes non payées n&apos;entrent pas dans l&apos;attestation fiscale.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
