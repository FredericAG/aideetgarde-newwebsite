import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ENTREPRISE } from "@/lib/entreprise";

/**
 * Accès au centre d'aide (décision de Frédéric du 12/11/2026) : réservé aux
 * clients connectés qui ont un abonnement actif. L'administrateur y accède
 * toujours. Un visiteur non connecté est envoyé vers la connexion.
 */
export async function accesCentreAide(chemin: string): Promise<boolean> {
  const { supabase, user, profile } = await requireUser(chemin);
  if (profile?.role === "admin") return true;
  const { count } = await supabase
    .from("abonnements")
    .select("id", { count: "exact", head: true })
    .eq("employeur_id", user.id)
    .eq("statut", "actif");
  return (count ?? 0) > 0;
}

/** Page affichée à un client connecté sans abonnement actif. */
export function AideReservee() {
  const tel = ENTREPRISE.telephone;
  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-2xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Centre d&apos;aide</h1>
        <div className="carte mt-6 p-5">
          <p className="font-bold text-brand-violet">Réservé aux abonnés</p>
          <p className="mt-2 text-sm text-foreground/80">
            Le centre d&apos;aide répond aux questions des employeurs que nous accompagnons : comprendre un bulletin de
            paie, les congés, un arrêt de travail, la fin d&apos;un contrat, les aides de la CAF. Il s&apos;ouvre dès
            que votre abonnement est actif.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/tableau-de-bord/abonnement" className="btn btn-primaire">
              Choisir ma formule
            </Link>
            <a href={`tel:${tel.replace(/\s/g, "").replace(/^0/, "+33")}`} className="btn btn-secondaire">
              Appeler le {tel}
            </a>
          </div>
          <p className="mt-3 text-xs text-foreground/60">
            Une question avant de vous abonner ? Un conseiller vous répond gratuitement. Numéro non surtaxé.
          </p>
        </div>
      </div>
    </div>
  );
}
