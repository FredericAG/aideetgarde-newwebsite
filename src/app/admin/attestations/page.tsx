import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatEuros } from "@/lib/data";
import { estAdministrateur } from "@/lib/user-profile";
import { ImportMontants } from "./ImportMontants";
import { enregistrerAjustement } from "./actions";

export const metadata = { title: "Attestations fiscales — Administration Aide & Garde" };

/**
 * Attestations fiscales (brique 15) : les abonnés les téléchargent eux-mêmes
 * dès le 1er janvier. Ici : import des montants payés hors du nouveau site
 * (ancien site) et ajustements.
 */
export default async function AttestationsPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const { supabase, profile } = await requireAdmin("/admin/attestations");
  const administrateur = estAdministrateur(profile);
  const { annee: a } = await searchParams;
  const derniere = new Date().getFullYear() - 1;
  const annee = Number(a) >= 2020 && Number(a) <= derniere ? Number(a) : derniere;

  const { data, error } = await supabase
    .from("attestations_montants")
    .select("employeur_id, montant_importe, ajustement, note, maj_le, profiles(reference_client, prenom, nom)")
    .eq("annee", annee)
    .order("maj_le", { ascending: false })
    .limit(2000);
  const lignes = (data ?? []) as unknown as {
    employeur_id: string;
    montant_importe: number;
    ajustement: number;
    note: string | null;
    profiles: { reference_client: string | null; prenom: string; nom: string } | null;
  }[];
  const totalImporte = lignes.reduce((s, l) => s + Number(l.montant_importe), 0);

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-4xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Attestations fiscales</h1>
        <p className="mt-2 max-w-3xl text-sm text-foreground/75">
          Chaque abonné télécharge son attestation dans son espace (Mon abonnement, et tableau de bord de janvier à avril).
          Montant = paiements reçus par le site dans l&apos;année + montant importé ici pour les paiements faits ailleurs
          (ancien site) + ajustement. N&apos;importez que ce qui n&apos;a pas été payé sur le nouveau site.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Années">
          {[derniere, derniere - 1].filter((x) => x >= 2025).map((x) => (
            <Link key={x} href={`/admin/attestations?annee=${x}`} className={`btn btn-sm ${x === annee ? "btn-primaire" : "btn-secondaire"}`}>
              {x}
            </Link>
          ))}
        </nav>

        {error && (
          <p className="mt-6 rounded-lg border border-brand-jaune bg-brand-jaune/20 p-3 text-sm">
            Exécutez le script supabase/brique15_attestations_fiscales.sql.
          </p>
        )}

        {administrateur && !error && (
          <section className="carte mt-6 p-4 sm:p-5" aria-labelledby="titre-import">
            <h2 id="titre-import" className="font-bold text-brand-teal">
              Importer les montants {annee} payés sur l&apos;ancien site
            </h2>
            <div className="mt-3">
              <ImportMontants annee={annee} />
            </div>
          </section>
        )}

        <section className="carte mt-6 p-4 sm:p-5" aria-labelledby="titre-liste">
          <h2 id="titre-liste" className="font-bold text-brand-teal">
            Montants importés pour {annee} : {lignes.length} abonné(s), {formatEuros(totalImporte)}
          </h2>
          {lignes.length === 0 ? (
            <p className="mt-2 text-sm text-foreground/70">Aucun montant importé pour cette année.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-gray/25 text-left text-xs text-foreground/60">
                    <th className="py-1.5 pr-3">Abonné</th>
                    <th className="py-1.5 pr-3 text-right">Importé</th>
                    <th className="py-1.5 pr-3">Ajustement</th>
                    <th className="py-1.5 pr-3">Attestation</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.slice(0, 500).map((l) => (
                    <tr key={l.employeur_id} className="border-b border-brand-gray/10 align-top">
                      <td className="py-1.5 pr-3">
                        <Link href={`/admin/comptes/${l.employeur_id}`} className="text-brand-teal underline">
                          {l.profiles?.reference_client} {l.profiles?.prenom} {l.profiles?.nom}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-3 text-right tabular-nums">{formatEuros(l.montant_importe)}</td>
                      <td className="py-1.5 pr-3">
                        {administrateur ? (
                          <form action={enregistrerAjustement} className="flex flex-wrap items-center gap-1">
                            <input type="hidden" name="employeur_id" value={l.employeur_id} />
                            <input type="hidden" name="annee" value={annee} />
                            <input
                              name="ajustement"
                              defaultValue={String(l.ajustement).replace(".", ",")}
                              inputMode="decimal"
                              aria-label="Ajustement en euros"
                              className="w-20 rounded border border-brand-gray/40 bg-background px-2 py-1"
                            />
                            <input name="note" defaultValue={l.note ?? ""} placeholder="motif" aria-label="Motif" className="w-28 rounded border border-brand-gray/40 bg-background px-2 py-1" />
                            <button type="submit" className="btn btn-secondaire btn-sm">
                              OK
                            </button>
                          </form>
                        ) : (
                          formatEuros(l.ajustement)
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        <a href={`/admin/comptes/${l.employeur_id}/attestation/${annee}`} className="text-brand-teal underline">
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
