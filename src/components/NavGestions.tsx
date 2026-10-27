import Link from "next/link";
import { nomSalarie } from "@/lib/data";
import type { GestionNav } from "@/lib/mes-gestions";

/**
 * Rangée de pastilles « Mes gestions » (24/10) : une par salarié, celle
 * affichée en violet. En cours d'abord, puis en préparation, puis
 * terminées. Le nombre de nouveaux documents figure sur chaque pastille.
 * Sur téléphone, la rangée défile horizontalement.
 */
export function NavGestions({ gestions, courante }: { gestions: GestionNav[]; courante: string }) {
  if (gestions.length === 0) return null;
  const pastille = (g: GestionNav) => {
    const actif = g.id === courante;
    return (
      <Link
        key={g.id}
        href={`/tableau-de-bord/gestions/${g.id}`}
        scroll={false}
        aria-current={actif ? "page" : undefined}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors ${
          actif
            ? "border-brand-violet bg-brand-violet text-white"
            : "border-brand-violet/30 bg-white text-brand-violet hover:border-brand-violet"
        } ${g.statut === "terminee" && !actif ? "opacity-75" : ""}`}
      >
        {nomSalarie(g) || "Nouveau salarié"}
        {(g.statut === "brouillon" || g.statut === "envoyee") && (
          <span className={`text-[11px] font-medium ${actif ? "text-white/80" : "text-foreground/50"}`}>
            {g.statut === "brouillon" ? "brouillon" : "en attente"}
          </span>
        )}
        {g.nouveaux > 0 && (
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
              actif ? "bg-white text-brand-violet" : "bg-brand-jaune text-brand-black"
            }`}
            title={`${g.nouveaux} nouveau(x) document(s)`}
          >
            {g.nouveaux}
          </span>
        )}
      </Link>
    );
  };
  const actives = gestions.filter((g) => g.statut !== "terminee");
  const terminees = gestions.filter((g) => g.statut === "terminee");
  return (
    <div>
      <nav aria-label="Mes gestions" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
          {actives.map(pastille)}
          {terminees.length > 0 && (
            <>
              <span className="ml-1 shrink-0 text-xs font-bold uppercase tracking-wide text-foreground/50">Terminées</span>
              {terminees.map(pastille)}
            </>
          )}
        </div>
      </nav>
      {/* Juste sous la liste (demande du 27/10) ; sans abonnement, la page
          de création l'explique. */}
      <Link href="/tableau-de-bord/gestions/nouvelle" className="btn btn-secondaire btn-sm mt-3">
        + Ajouter un salarié
      </Link>
    </div>
  );
}
