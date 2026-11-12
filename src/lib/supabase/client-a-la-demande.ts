/**
 * Module Supabase du navigateur, chargé seulement quand on en a besoin
 * (audit du 12/11/2026). Il pèse 250 Ko : importé directement par les pages
 * « Se connecter » et « Créer un compte », il était téléchargé par tous les
 * visiteurs dès l'accueil, puisque ces pages y sont liées depuis l'en-tête.
 *
 * - `prechargerClient()` : à appeler dès que la personne touche le
 *   formulaire, pour que l'envoi reste immédiat ;
 * - `clientALaDemande()` : à l'envoi du formulaire.
 */
export function prechargerClient(): void {
  void import("./client").catch(() => null);
}

export async function clientALaDemande() {
  const { createClient } = await import("./client");
  return createClient();
}
