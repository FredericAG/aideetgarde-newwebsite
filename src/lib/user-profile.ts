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
  created_at?: string;
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
    .select("id, email, role, prenom, nom, telephone, adresse, code_postal, ville, created_at")
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

/**
 * Compléments du profil demandés une seule fois, avant la première gestion
 * (demande du 25/10) : civilité (courriers) et date de naissance (certaines
 * déclarations Urssaf). Lecture tolérante : tant que le script brique3g n'a
 * pas été exécuté, les colonnes n'existent pas et `disponible` vaut false.
 */
export interface ComplementProfil {
  disponible: boolean;
  civilite: "" | "Madame" | "Monsieur";
  date_naissance: string;
}

export function lireComplementProfil(ligne: Record<string, unknown> | null | undefined): ComplementProfil {
  const disponible = Boolean(ligne && "civilite" in ligne && "date_naissance" in ligne);
  const c = String(ligne?.civilite ?? "");
  return {
    disponible,
    civilite: c === "Madame" || c === "Monsieur" ? c : "",
    date_naissance: String(ligne?.date_naissance ?? "").slice(0, 10),
  };
}

/** Ce qui manque au profil pour préparer contrats et courriers. */
export function profilIncomplet(p: UserProfile, c: ComplementProfil): string[] {
  const manque: string[] = [];
  if (c.disponible && !c.civilite) manque.push("civilité");
  if (!p.prenom.trim() || !p.nom.trim()) manque.push("prénom et nom");
  if (c.disponible && !c.date_naissance) manque.push("date de naissance");
  if (!p.telephone.trim()) manque.push("téléphone");
  if (!p.adresse.trim() || !p.code_postal.trim() || !p.ville.trim()) manque.push("adresse");
  return manque;
}
