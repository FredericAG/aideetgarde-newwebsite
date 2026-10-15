/**
 * Fait échouer une opération réseau qui ne répond jamais. Sans cela, un
 * formulaire dont l'appel au serveur reste en attente affiche "en cours…"
 * indéfiniment, sans message d'erreur ni piste de diagnostic.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("TIMEOUT")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export const MESSAGE_RESEAU =
  "Le service ne répond pas (connexion impossible ou délai dépassé). Réessayez dans un instant ; si le problème continue, contactez-nous.";
