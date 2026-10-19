import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Envoi des notifications « Web Push » vers les téléphones et ordinateurs
 * des abonnés qui les ont activées (voir supabase/brique9a_...sql).
 *
 * Clés VAPID : elles identifient le site auprès des services
 * d'acheminement (Google, Apple, Mozilla). La clé publique est connue du
 * navigateur ; la clé privée reste un secret du serveur (variable Vercel
 * VAPID_PRIVATE_KEY, jamais préfixée NEXT_PUBLIC_).
 *
 * Une notification ne doit jamais faire échouer l'action qui la déclenche :
 * en cas de problème, on l'écrit dans les journaux et on continue.
 */

let configure = false;
function configurer(): boolean {
  const publique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  if (!publique || !privee) return false;
  if (!configure) {
    webpush.setVapidDetails("mailto:contact@aideetgarde.fr", publique, privee);
    configure = true;
  }
  return true;
}

export interface MessagePush {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Envoie un message à tous les appareils enregistrés d'un utilisateur. */
export async function notifierUtilisateur(
  supabase: SupabaseClient,
  userId: string,
  message: MessagePush,
): Promise<void> {
  try {
    if (!configurer()) {
      console.warn("Notifications push non configurées (clés VAPID absentes).");
      return;
    }
    const { data: appareils } = await supabase
      .from("notifications_push")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!appareils?.length) return;

    const charge = JSON.stringify(message);
    const perimes: string[] = [];
    await Promise.all(
      appareils.map(async (a) => {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint as string, keys: { p256dh: a.p256dh as string, auth: a.auth as string } },
            charge,
            { TTL: 60 * 60 * 24 * 7, urgency: "normal", timeout: 5000 },
          );
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          // 404 / 410 : l'appareil s'est désabonné ou l'abonnement a expiré.
          if (code === 404 || code === 410) perimes.push(a.id as string);
          else console.error("Échec d'envoi d'une notification :", code ?? e);
        }
      }),
    );
    if (perimes.length) {
      await supabase.from("notifications_push").delete().in("id", perimes);
    }
  } catch (e) {
    console.error("Notifications push : erreur inattendue", e);
  }
}
