import Link from "next/link";
import { EncartRecommander } from "@/components/EncartRecommander";
import { requireUser } from "@/lib/auth";
import { type UserProfile } from "@/lib/user-profile";
import { ProfileForm } from "./ProfileForm";
import { NotificationsPush } from "@/components/NotificationsPush";
import { DeconnexionButton } from "@/components/DeconnexionButton";
import { PreferenceEmail } from "./PreferenceEmail";

/**
 * Page protégée. Le Proxy (`src/proxy.ts`) redirige déjà les requêtes sans
 * session ; `requireUser` revérifie ici avant d'exposer la moindre donnée
 * (double vérification), et la base (RLS) reste la dernière barrière.
 */
export default async function MonComptePage() {
  const { supabase, user, profile } = await requireUser("/mon-compte");
  // Préférence « copie par email » (brique9b) ; « oui » par défaut, y
  // compris tant que le script n'a pas été exécuté.
  const { data: prefs } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

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

        <NotificationsPush />

        <PreferenceEmail
          actifInitial={prefs?.notifications_email !== false}
          email={user.email ?? ""}
        />

        {profile?.role !== "admin" && <EncartRecommander className="mt-8" />}
        {/* Téléphone : la barre d'onglets de l'administration est pleine. */}
        {profile?.role === "admin" && (
          <p className="mt-8 text-sm">
            <Link href="/admin/partenaires" className="font-medium text-brand-teal underline">
              Statistiques des visites envoyées aux partenaires ›
            </Link>
          </p>
        )}

        {/* Sur téléphone, la déconnexion se trouve ici (onglet « Compte »). */}
        <div className="mt-8 border-t border-brand-gray/20 pt-6">
          <DeconnexionButton className="btn btn-secondaire w-full sm:w-auto" />
        </div>
      </div>
    </div>
  );
}
