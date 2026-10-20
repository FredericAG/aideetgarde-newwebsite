"use client";

import { useRouter } from "next/navigation";

/**
 * Lien de téléchargement d'un document. Le PDF est téléchargé sans quitter
 * la page : on redemande donc l'affichage au serveur juste après, pour que
 * le bandeau « nouveau document » et les pastilles « Nouveau » disparaissent
 * sans avoir à actualiser. Deux rafraîchissements espacés couvrent une
 * connexion lente (le serveur enregistre le téléchargement avant d'envoyer
 * le fichier).
 */
export function rafraichirApresTelechargement(router: ReturnType<typeof useRouter>) {
  setTimeout(() => router.refresh(), 1500);
  setTimeout(() => router.refresh(), 5000);
}

export function LienTelechargement({
  documentId,
  className,
  title,
  onTelecharge,
  children,
}: {
  documentId: string;
  className?: string;
  title?: string;
  /** Effet immédiat côté écran (ex. masquer le bouton du bandeau). */
  onTelecharge?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <a
      href={`/documents/${documentId}/telecharger`}
      className={className}
      title={title}
      onClick={() => {
        onTelecharge?.();
        rafraichirApresTelechargement(router);
      }}
    >
      {children}
    </a>
  );
}
