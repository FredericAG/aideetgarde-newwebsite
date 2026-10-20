"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateUserProfile } from "@/lib/user-profile";

export interface UpdateProfileState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Session expirée, reconnectez-vous." };
  }

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const adresse = String(formData.get("adresse") ?? "").trim();
  const codePostal = String(formData.get("code_postal") ?? "").trim();
  const ville = String(formData.get("ville") ?? "").trim();

  if (!prenom || !nom) {
    return { status: "error", message: "Le prénom et le nom sont obligatoires." };
  }

  try {
    await updateUserProfile(supabase, user.id, {
      prenom,
      nom,
      telephone,
      adresse,
      code_postal: codePostal,
      ville,
    });
  } catch {
    return { status: "error", message: "Échec de l'enregistrement. Réessayez." };
  }

  revalidatePath("/mon-compte");
  return { status: "success", message: "Profil mis à jour." };
}

/** Copie des notifications par email : oui / non (voir brique9b). */
export async function enregistrerPreferenceEmail(
  actif: boolean,
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return { ok: false, message: "Session expirée, reconnectez-vous." };

  const { error } = await supabase
    .from("profiles")
    .update({ notifications_email: Boolean(actif) })
    .eq("id", uid);
  if (error) {
    return {
      ok: false,
      message: "Impossible d'enregistrer ce choix pour le moment. Réessayez dans un instant.",
    };
  }
  revalidatePath("/mon-compte");
  return {
    ok: true,
    message: actif ? "Vous recevrez aussi les notifications par email." : "Plus d'email de notification.",
  };
}
