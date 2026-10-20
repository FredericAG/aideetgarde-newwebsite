import { IconeTelechargement } from "@/components/IconeTelechargement";
import { LienTelechargement } from "@/components/LienTelechargement";

/**
 * Bouton « Télécharger » d'une ligne de document : pilule avec texte sur
 * ordinateur, rond avec la seule icône sur téléphone (le texte reste lu par
 * les lecteurs d'écran). 40 px de côté : facile à toucher du doigt.
 */
export function BoutonTelechargement({ documentId, titre }: { documentId: string; titre: string }) {
  return (
    <LienTelechargement
      documentId={documentId}
      title={`Télécharger « ${titre} »`}
      className="btn btn-secondaire btn-sm max-sm:h-10 max-sm:w-10 max-sm:p-0"
    >
      <IconeTelechargement className="h-4 w-4 max-sm:h-5 max-sm:w-5" />
      <span className="max-sm:sr-only">Télécharger</span>
    </LienTelechargement>
  );
}
