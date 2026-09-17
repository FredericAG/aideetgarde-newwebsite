import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { ProfileForm } from "./ProfileForm";

/**
 * Page protégée. Le Proxy (`src/proxy.ts`) redirige déjà les requêtes sans
 * session, mais on revérifie ici avec `getUser()` (qui revalide le jeton
 * auprès de Supabase, contrairement à `getSession()`) avant d'exposer la
 * moindre donnée — même principe de double vérification que sous Firebase.
 */
export default async function MonComptePage() {
  // Avant que le projet Supabase soit configuré (voir .env.example),
  // personne ne peut être authentifié : autant rediriger proprement que
  // planter la page.
  if (!isSupabaseConfigured()) {
    redirect("/connexion?next=/mon-compte");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/mon-compte");
  }

  const profile = await getUserProfile(supabase, user.id);

  // Ne devrait pas arriver (le profil est créé par un trigger Postgres à
  // l'inscription, voir supabase/schema.sql), mais on reste défensif plutôt
  // que de planter la page si la ligne manque.
  const safeProfile: UserProfile = profile ?? {
    id: user.id,
    email: user.email ?? null,
    role: "employeur",
    prenom: "",
    nom: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
  };

  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display font-black text-2xl text-brand-teal">
          Mon compte
        </h1>
        <p className="mt-2 text-sm text-foreground/70">{user.email}</p>

        <ProfileForm profile={safeProfile} />
      </div>
    </div>
  );
}
