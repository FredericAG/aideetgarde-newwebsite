import Link from "next/link";
import { ENTREPRISE } from "@/lib/entreprise";

/** Invitation à recommander Aide & Garde à un proche (bouche à oreille). */
export function EncartRecommander({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="Recommander Aide & Garde"
      className={`flex flex-col gap-3 rounded-xl border-2 border-brand-jaune bg-brand-jaune/15 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm">
        <strong className="text-brand-teal">Parrainez un proche :</strong> un mois offert pour lui, et un pour vous,
        quand il nous rejoint.
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-3 self-start sm:self-auto">
        <Link href="/recommander" className="btn btn-primaire btn-sm">
          Parrainer un proche
        </Link>
        {/* Avis Google : proposé à tous les abonnés de la même façon (Google
            interdit de ne solliciter que les clients satisfaits). */}
        {ENTREPRISE.deposerAvisGoogle && (
          <a href={ENTREPRISE.deposerAvisGoogle} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-teal underline">
            Donner mon avis sur Google ↗
          </a>
        )}
      </div>
    </section>
  );
}
