export const metadata = {
  title: "Politique de confidentialité — Aide & Garde",
};

/**
 * Page temporaire, référencée par le lien de la case à cocher du formulaire
 * d'inscription (`src/app/inscription/page.tsx`). À remplacer par le texte
 * définitif (mentions légales + politique de confidentialité RGPD réelles)
 * avant l'ouverture publique du nouveau site — pas bloquant pour la brique 1
 * puisque le site n'est pour l'instant pas en ligne pour de vrais visiteurs.
 */
export default function ConfidentialitePage() {
  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Politique de confidentialité
        </h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          Cette page est un espace réservé. Le texte définitif (données
          collectées, finalités, durée de conservation, droits RGPD,
          coordonnées du responsable de traitement) sera rédigé avant la mise
          en ligne publique du site.
        </p>
      </div>
    </div>
  );
}
