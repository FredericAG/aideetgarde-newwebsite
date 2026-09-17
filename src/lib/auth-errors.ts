import { isAuthApiError } from "@supabase/supabase-js";

/**
 * Traduit les erreurs Supabase Auth les plus courantes en français.
 * On se base sur `error.code` (stable, documenté) plutôt que sur le message
 * anglais brut, qui peut changer sans préavis.
 */
export function authErrorMessage(error: unknown): string {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "user_already_exists":
        return "Un compte existe déjà avec cette adresse email.";
      case "invalid_credentials":
        return "Email ou mot de passe incorrect.";
      case "weak_password":
        return "Mot de passe trop court (8 caractères minimum).";
      case "email_not_confirmed":
        return "Adresse email non confirmée. Vérifiez votre boîte de réception.";
      case "over_email_send_rate_limit":
      case "over_request_rate_limit":
        return "Trop de tentatives. Réessayez dans quelques minutes.";
      case "validation_failed":
        return "Adresse email invalide.";
      default:
        return "Une erreur est survenue. Réessayez.";
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
