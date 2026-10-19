/**
 * Affiché instantanément pendant le chargement d'une page : le clic sur un
 * lien a ainsi un effet visible tout de suite, même si les données mettent
 * quelques centaines de millisecondes à arriver.
 */
export default function Chargement() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24" aria-live="polite">
      <span className="flex items-center gap-3 text-sm text-foreground/60">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
        Chargement…
      </span>
    </div>
  );
}
