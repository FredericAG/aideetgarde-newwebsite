import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Civilite, Gestion } from "@/lib/data";
import type { UserProfile } from "@/lib/user-profile";
import type { ContexteCourrier } from "./modeles";

function civilite(v: unknown): Civilite {
  return v === "Madame" || v === "Monsieur" ? v : "";
}

/**
 * Données connues pour préremplir les courriers d'une gestion : profil de
 * l'employeur (Mon compte) et coordonnées du salarié mémorisées dans la
 * gestion (script brique3e ; sans lui, simplement vides).
 */
export async function contexteCourrier(
  supabase: SupabaseClient,
  profile: UserProfile | null,
  gestion: Gestion,
): Promise<ContexteCourrier> {
  const { data } = await supabase.from("profiles").select("civilite").eq("id", gestion.employeur_id).maybeSingle();
  return {
    employeur: {
      civilite: civilite(data?.civilite),
      prenom: profile?.prenom ?? "",
      nom: profile?.nom ?? "",
      adresse: profile?.adresse ?? "",
      code_postal: profile?.code_postal ?? "",
      ville: profile?.ville ?? "",
      telephone: profile?.telephone ?? "",
    },
    salarie: {
      civilite: civilite(gestion.civilite_salarie),
      prenom: gestion.prenom_salarie,
      nom: gestion.nom_salarie,
      adresse: gestion.adresse_salarie ?? "",
      code_postal: gestion.code_postal_salarie ?? "",
      ville: gestion.ville_salarie ?? "",
    },
    gestion: {
      reference: gestion.reference,
      type_gestion: gestion.type_gestion,
      type_contrat: gestion.type_contrat ?? null,
      date_debut: gestion.date_debut,
      heures: gestion.heures ?? null,
      unite_heures: gestion.unite_heures ?? null,
    },
  };
}
