import { requireAdmin } from "@/lib/auth";
import { DepotEnMasse } from "./DepotEnMasse";

export const metadata = { title: "Dépôt de documents — Administration Aide & Garde" };

/**
 * Dépôt en masse des PDF (brique 4, spécifications § 5.6) : chaque fichier
 * nommé à la norme est rangé dans la gestion de sa référence AG, après un
 * récapitulatif que l'administrateur valide.
 */
export default async function DepotPage() {
  await requireAdmin("/admin/depot");
  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-6xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Dépôt de documents</h1>
        <p className="mt-2 max-w-3xl text-sm text-foreground/70">
          Déposez en une fois les PDF de plusieurs gestions. Chaque fichier est rangé d&apos;après la
          référence de gestion en tête de son nom ; les noms de l&apos;employeur et du salarié servent de
          contrôle. Un fichier dont la destination n&apos;est pas certaine n&apos;est jamais déposé sans votre
          accord, et un document déjà en ligne n&apos;est remplacé que si vous le choisissez.
        </p>
        <div className="mt-6">
          <DepotEnMasse />
        </div>
      </div>
    </div>
  );
}
