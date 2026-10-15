import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/data";

interface CompteRow {
  id: string;
  email: string | null;
  role: string;
  prenom: string;
  nom: string;
  created_at: string;
}

/**
 * Back-office, brique 1-2 : liste des comptes (lecture seule) avec, pour
 * chacun, l'état de son abonnement. On y entre pour créer / modifier les
 * données de test d'un compte (voir la fiche d'un compte).
 */
export default async function AdminPage() {
  const { supabase } = await requireAdmin("/admin");

  const [comptesRes, abosRes, gestionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role, prenom, nom, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("abonnements")
      .select("employeur_id, quota_gestions")
      .eq("statut", "actif"),
    supabase.from("gestions").select("employeur_id").eq("statut", "en_cours"),
  ]);

  const comptes = (comptesRes.data ?? []) as CompteRow[];
  const quotaParCompte = new Map(
    (abosRes.data ?? []).map((a) => [a.employeur_id as string, a.quota_gestions as number]),
  );
  const enCoursParCompte = new Map<string, number>();
  for (const g of gestionsRes.data ?? []) {
    const id = g.employeur_id as string;
    enCoursParCompte.set(id, (enCoursParCompte.get(id) ?? 0) + 1);
  }

  const erreur = comptesRes.error || abosRes.error || gestionsRes.error;

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Administration — comptes
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {comptes.length} compte(s). Cliquez sur un compte pour gérer son
          abonnement, ses gestions et ses documents.
        </p>

        {erreur && (
          <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Erreur de lecture : {erreur.message}. Le script supabase/brique2.sql
            a-t-il bien été exécuté ?
          </p>
        )}

        <div className="mt-6 overflow-x-auto rounded-lg border border-brand-gray/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-sky-tint/30 text-brand-black">
              <tr>
                <th className="px-4 py-2 font-medium">Compte</th>
                <th className="px-4 py-2 font-medium">Rôle</th>
                <th className="px-4 py-2 font-medium">Inscrit le</th>
                <th className="px-4 py-2 font-medium">Abonnement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/15">
              {comptes.map((c) => {
                const quota = quotaParCompte.get(c.id);
                return (
                  <tr key={c.id} className="hover:bg-brand-sky-tint/20">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/comptes/${c.id}`}
                        className="font-medium text-brand-teal underline"
                      >
                        {`${c.prenom} ${c.nom}`.trim() || "(sans nom)"}
                      </Link>
                      <div className="text-foreground/60">{c.email}</div>
                    </td>
                    <td className="px-4 py-2">{c.role}</td>
                    <td className="px-4 py-2">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-2">
                      {quota === undefined
                        ? "—"
                        : `Actif · ${enCoursParCompte.get(c.id) ?? 0} / ${quota} gestions`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
