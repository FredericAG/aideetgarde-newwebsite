"use client";

import { useEffect, useState } from "react";
import {
  activerNotifications,
  desactiverNotifications,
} from "@/app/notifications/actions";

type Etat =
  | "chargement"
  | "non-supporte"
  | "iphone-a-installer"
  | "refuse"
  | "inactif"
  | "actif";

const CLE_REFUS = "ag-notifications-refusees";

function cleVersOctets(base64: string): Uint8Array<ArrayBuffer> {
  const remplissage = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + remplissage).replace(/-/g, "+").replace(/_/g, "/"));
  const octets = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i);
  return octets;
}

function estIphoneNonInstalle(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installe =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !installe;
}

function nomAppareil(): string {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/mac os/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  return "Navigateur";
}

/**
 * Activation des notifications sur l'appareil utilisé (téléphone ou
 * ordinateur). Version « compacte » pour le tableau de bord : n'apparaît
 * que si les notifications ne sont pas encore activées.
 */
export function NotificationsPush({ compact = false }: { compact?: boolean }) {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  // « Non merci » sur le tableau de bord : choix mémorisé sur cet appareil.
  // Les notifications restent activables à tout moment depuis « Mon compte ».
  const [refusMemorise, setRefusMemorise] = useState(false);
  const clePublique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    // L'abonné consulte son espace : on retire la pastille de l'icône et on
    // remet à zéro son compteur (tenu par le service worker, public/sw.js).
    if ("clearAppBadge" in navigator) {
      (navigator as Navigator & { clearAppBadge: () => Promise<void> })
        .clearAppBadge()
        .catch(() => {});
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((r) => r.active?.postMessage("effacer-pastille"))
        .catch(() => {});
    }
    (async () => {
      try {
        setRefusMemorise(localStorage.getItem(CLE_REFUS) === "1");
      } catch {
        /* stockage indisponible : on affiche simplement la carte */
      }
      if (estIphoneNonInstalle()) return setEtat("iphone-a-installer");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !clePublique) {
        return setEtat("non-supporte");
      }
      if (Notification.permission === "denied") return setEtat("refuse");
      const enregistrement = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const abonnement = await enregistrement.pushManager.getSubscription();
      setEtat(abonnement ? "actif" : "inactif");
    })().catch(() => setEtat("non-supporte"));
  }, [clePublique]);

  async function activer() {
    setEnCours(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }
      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cleVersOctets(clePublique!),
      });
      const resultat = await activerNotifications(
        JSON.parse(JSON.stringify(abonnement)),
        nomAppareil(),
      );
      setMessage(resultat.message);
      setEtat(resultat.ok ? "actif" : "inactif");
      if (!resultat.ok) await abonnement.unsubscribe();
    } catch (e) {
      console.error("Activation des notifications impossible :", e);
      setMessage("L'activation n'a pas abouti sur cet appareil.");
    } finally {
      setEnCours(false);
    }
  }

  async function desactiver() {
    setEnCours(true);
    try {
      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.getSubscription();
      if (abonnement) {
        await desactiverNotifications(abonnement.endpoint);
        await abonnement.unsubscribe();
      }
      setEtat("inactif");
      setMessage("Notifications désactivées sur cet appareil.");
    } finally {
      setEnCours(false);
    }
  }

  function refuser() {
    try {
      localStorage.setItem(CLE_REFUS, "1");
    } catch {
      /* sans stockage, la carte réapparaîtra à la prochaine visite */
    }
    setRefusMemorise(true);
  }

  if (etat === "chargement") return null;
  if (compact && (refusMemorise || etat === "actif" || etat === "non-supporte" || etat === "refuse")) {
    return null;
  }

  return (
    <section className="mt-6 rounded-lg border border-brand-teal/30 bg-brand-sky-tint/20 p-4 text-sm">
      <h2 className="font-bold text-brand-teal">Notifications</h2>
      {etat === "iphone-a-installer" && (
        <p className="mt-1 text-foreground/80">
          Pour être prévenu sur votre iPhone dès qu&apos;un document est mis en
          ligne, installez d&apos;abord l&apos;espace sur votre écran
          d&apos;accueil : bouton Partager, puis « Sur l&apos;écran
          d&apos;accueil ». Ouvrez-le ensuite depuis l&apos;icône Aide &amp;
          Garde pour activer les notifications.
          {compact && (
            <button type="button" onClick={refuser} className="ml-2 underline">
              Non merci
            </button>
          )}
        </p>
      )}
      {etat === "non-supporte" && (
        <p className="mt-1 text-foreground/80">
          Ce navigateur ne permet pas de recevoir des notifications.
        </p>
      )}
      {etat === "refuse" && (
        <p className="mt-1 text-foreground/80">
          Les notifications sont bloquées pour ce site dans les réglages de
          votre navigateur ou de votre téléphone. Autorisez-les dans ces
          réglages pour être prévenu des nouveaux documents.
        </p>
      )}
      {etat === "inactif" && (
        <>
          <p className="mt-1 text-foreground/80">
            Soyez prévenu sur cet appareil dès qu&apos;un bulletin ou un
            document est mis en ligne.
          </p>
          <button
            type="button"
            onClick={activer}
            disabled={enCours}
            className="mt-3 w-full rounded-md bg-brand-teal px-4 py-3 font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {enCours ? "Activation…" : "Activer les notifications"}
          </button>
          {compact && (
            <button
              type="button"
              onClick={refuser}
              className="mt-3 w-full rounded-md px-4 py-3 text-foreground/70 underline sm:ml-3 sm:w-auto"
            >
              Non merci
            </button>
          )}
        </>
      )}
      {!compact && etat === "inactif" && (
        <p className="mt-2 text-xs text-foreground/60">
          Vous pouvez refuser : vos documents restent consultables dans votre
          espace, sans notification.
        </p>
      )}
      {etat === "actif" && (
        <>
          <p className="mt-1 text-foreground/80">
            Notifications activées sur cet appareil : vous serez prévenu à
            chaque nouveau document.
          </p>
          <button
            type="button"
            onClick={desactiver}
            disabled={enCours}
            className="mt-3 rounded-md border border-brand-gray/40 px-3 py-2 disabled:opacity-60"
          >
            {enCours ? "…" : "Désactiver sur cet appareil"}
          </button>
        </>
      )}
      {message && <p className="mt-2 text-brand-teal" aria-live="polite">{message}</p>}
    </section>
  );
}
