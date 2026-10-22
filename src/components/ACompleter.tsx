/**
 * Valeur légale d'Aide & Garde (src/lib/entreprise.ts) ; tant qu'elle n'est
 * pas renseignée, un repère jaune « à compléter » s'affiche à la place, pour
 * ne jamais publier une information inventée.
 */
export function ACompleter({ valeur, quoi }: { valeur: string | null | undefined; quoi: string }) {
  if (valeur) return <>{valeur}</>;
  return (
    <mark className="rounded bg-brand-jaune px-1 text-brand-black" title="Information à renseigner dans src/lib/entreprise.ts">
      [{quoi} à compléter]
    </mark>
  );
}
