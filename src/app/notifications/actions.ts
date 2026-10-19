"use server";

import { requireUser } from "@/lib/auth";

export interface AbonnementSerialise {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}

/** Enregistre l'appareil courant pour recevoir les notifications. */
export async function activerNotifications(
  abonnement: AbonnementSerialise,
  appareil: string,
): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireUser("/mon-compte");
  const p256dh = abonnement.keys?.p256dh ?? "";
  const auth = abonnement.keys?.auth ?? "";
  if (!abonnement.endpoint || !p256dh || !auth) {
    return { ok: false, message: "Votre navigateur n'a pas fourni d'abonnement valide." };
  }
  const { error } = await supabase.rpc("enregistrer_appareil_push", {
    p_endpoint: abonnement.endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_appareil: appareil,
  });
  if (error) {
    return {
      ok: false,
      message: error.code === "P0001" ? error.message : "L'activation n'a pas abouti. Réessayez.",
    };
  }
  return { ok: true, message: "Notifications activées sur cet appareil." };
}

/** Retire l'appareil courant de la liste des destinataires. */
export async function desactiverNotifications(
  endpoint: string,
): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await requireUser("/mon-compte");
  await supabase
    .from("notifications_push")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  return { ok: true, message: "Notifications désactivées sur cet appareil." };
}
