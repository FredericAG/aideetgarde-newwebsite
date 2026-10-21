/** Bloc « Une question ? » en bas des pages du centre d'aide. */
export function BlocContact() {
  return (
    <section id="contact" className="carte mt-10 scroll-mt-4 p-5">
      <h2 className="font-bold text-brand-violet">Vous ne trouvez pas la réponse ?</h2>
      <p className="mt-1 text-sm text-foreground/80">Votre conseiller Aide &amp; Garde vous répond.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a href="tel:+33188320118" className="btn btn-primaire">
          Appeler le 01 88 320 118
        </a>
        <a href="mailto:contact@aideetgarde.fr" className="btn btn-secondaire">
          contact@aideetgarde.fr
        </a>
      </div>
      <p className="mt-2 text-xs text-foreground/60">Numéro non surtaxé.</p>
    </section>
  );
}
