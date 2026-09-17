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
