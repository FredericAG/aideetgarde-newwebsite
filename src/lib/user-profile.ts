import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rôle générique porté par chaque compte. Un seul rôle existe réellement au
 * lancement ("employeur"), mais le champ est volontairement un rôle libre
 * plutôt qu'un booléen ou une valeur codée en dur : ajouter un espace
 * salarié ou un accès admin plus tard (brique 3+) sera un ajout de valeur
 * possible, pas une migration de schéma. Voir la feuille de route, décision
 * actée n°2 (modèle de données extensible dès la brique 1).
 *
 * Contrairement à la version Firestore, ce rôle n'est pas seulement protégé
 * par la logique applicative : la table `profiles` (voir `supabase/schema.sql`)
 * n'accorde à l'utilisateur authentifié un droit d'écriture QUE sur les
 * colonnes de contact (prenom, nom, téléphone, adresse...), pas sur `role` —
 * la base de données elle-même refuse toute tentative de contournement du
 * code, même en cas de bug applicatif.
 */
export type UserRole = "employeur" | "salarie" | "admin";

export interface UserProfile {
  id: string;
  email: string | null;
  role: UserRole;
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
}

const PROFILES_TABLE = "profiles";

/**
 * Récupère le profil d'un utilisateur. Le profil est créé automatiquement à
 * l'inscription par un trigger Postgres (`handle_new_user`, voir
 * `supabase/schema.sql`) — il ne devrait donc jamais être `null` en usage
 * normal, mais on reste défensif.
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  uid: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, email, role, prenom, nom, telephone, adresse, code_postal, ville")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export interface ProfileUpdate {
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
}

export async function updateUserProfile(
  supabase: SupabaseClient,
  uid: string,
  update: ProfileUpdate,
): Promise<void> {
  const { error } = await supabase
    .from(PROFILES_TABLE)
    .update(update)
    .eq("id", uid);

  if (error) {
    throw error;
  }
}
