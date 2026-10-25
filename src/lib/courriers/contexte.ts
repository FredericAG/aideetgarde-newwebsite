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
  // select("*") : civilité et date de naissance n'existent qu'après les
  // scripts brique3e et brique3g.
  const { data } = await supabase.from("profiles").select("*").eq("id", gestion.employeur_id).maybeSingle();
  const details = Object.fromEntries(
    Object.entries(gestion.config ?? {}).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  // L'abonné gère le contrat pour un proche (formulaire de la gestion) :
  // l'employeur des courriers est ce proche, pas le titulaire du compte.
  const tiers = details.employeur_tiers === "oui" && Boolean(details.employeur_nom);
  return {
    employeur: tiers
      ? {
          civilite: civilite(details.employeur_civilite),
          prenom: details.employeur_prenom ?? "",
          nom: details.employeur_nom ?? "",
          adresse: details.employeur_adresse ?? "",
          code_postal: details.employeur_code_postal ?? "",
          ville: details.employeur_ville ?? "",
          telephone: profile?.telephone ?? "",
          date_naissance: details.employeur_date_naissance ?? "",
        }
      : {
          civilite: civilite(data?.civilite),
          prenom: profile?.prenom ?? "",
          nom: profile?.nom ?? "",
          adresse: profile?.adresse ?? "",
          code_postal: profile?.code_postal ?? "",
          ville: profile?.ville ?? "",
          telephone: profile?.telephone ?? "",
          date_naissance: String(data?.date_naissance ?? "").slice(0, 10),
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
      date_fin_prevue: gestion.date_fin_prevue ?? null,
      remplacement: Boolean(gestion.remplace_gestion_id),
    },
    details,
  };
}
