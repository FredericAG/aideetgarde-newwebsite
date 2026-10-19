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

export interface BilanPush {
  appareils: number;
  envoyes: number;
  echecs: string[]; // codes d'erreur renvoyés par les services d'acheminement
  perimes: number;
  nonConfigure: boolean;
}

/** Résumé lisible du bilan d'envoi, affiché à l'administrateur après un dépôt. */
export function resumerBilan(b: BilanPush): string {
  if (b.nonConfigure) return "notifications non configurées sur le serveur (clés VAPID absentes)";
  if (b.appareils === 0) return "aucun appareil de l'abonné n'a activé les notifications";
  const morceaux = [`notification envoyée à ${b.envoyes} appareil(s) sur ${b.appareils}`];
  if (b.perimes) morceaux.push(`${b.perimes} appareil(s) désabonné(s) retiré(s)`);
  if (b.echecs.length) morceaux.push(`échec : ${b.echecs.join(", ")}`);
  return morceaux.join(" ; ");
}

/** Envoie un message à tous les appareils enregistrés d'un utilisateur. */
export async function notifierUtilisateur(
  supabase: SupabaseClient,
  userId: string,
  message: MessagePush,
): Promise<BilanPush> {
  const bilan: BilanPush = { appareils: 0, envoyes: 0, echecs: [], perimes: 0, nonConfigure: false };
  try {
    if (!configurer()) {
      console.warn("Notifications push non configurées (clés VAPID absentes).");
      bilan.nonConfigure = true;
      return bilan;
    }
    const { data: appareils, error } = await supabase
      .from("notifications_push")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) {
      bilan.echecs.push(`lecture des appareils impossible (${error.code ?? error.message})`);
      return bilan;
    }
    if (!appareils?.length) return bilan;
    bilan.appareils = appareils.length;

    const charge = JSON.stringify(message);
    const perimes: string[] = [];
    await Promise.all(
      appareils.map(async (a) => {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint as string, keys: { p256dh: a.p256dh as string, auth: a.auth as string } },
            charge,
            { TTL: 60 * 60 * 24 * 7, urgency: "high", timeout: 5000 },
          );
          bilan.envoyes++;
        } catch (e) {
          const err = e as { statusCode?: number; body?: string };
          // 404 / 410 : l'appareil s'est désabonné ou l'abonnement a expiré.
          if (err.statusCode === 404 || err.statusCode === 410) perimes.push(a.id as string);
          else {
            bilan.echecs.push(String(err.statusCode ?? "réseau"));
            console.error("Échec d'envoi d'une notification :", err.statusCode, err.body ?? e);
          }
        }
      }),
    );
    if (perimes.length) {
      bilan.perimes = perimes.length;
      await supabase.from("notifications_push").delete().in("id", perimes);
    }
  } catch (e) {
    console.error("Notifications push : erreur inattendue", e);
    bilan.echecs.push("erreur inattendue");
  }
  return bilan;
}
