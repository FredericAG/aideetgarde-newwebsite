"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Consentement aux traceurs publicitaires (pixel Meta) — CNIL,
 * lignes directrices et recommandation « cookies » du 17/09/2020.
 *
 * - Rien ne s'affiche et rien n'est chargé tant que la variable
 *   NEXT_PUBLIC_META_PIXEL_ID n'est pas renseignée dans Vercel.
 * - Le pixel n'est chargé qu'après « Tout accepter », et jamais dans les
 *   espaces privés ni sur les pages de connexion et d'inscription (aucune
 *   donnée de compte, de salarié ou de paie ne doit partir chez Meta).
 * - « Tout refuser » est aussi simple et visible que « Tout accepter ».
 * - Le choix est gardé 6 mois, puis redemandé ; il se modifie à tout moment
 *   par « Gérer les cookies » en pied de page.
 */
export const PIXEL_META = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const COOKIE = "ag_consentement";
const SIX_MOIS = 60 * 60 * 24 * 182;
export const EVENEMENT_GERER = "ag:gerer-cookies";
const EVENEMENT_CHOIX = "ag:choix-cookies";

/** Pages où le pixel ne doit jamais être chargé. */
const PAGES_PRIVEES = [
  "/tableau-de-bord",
  "/admin",
  "/mon-compte",
  "/documents",
  "/notifications",
  "/auth",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
];

/** « serveur » pendant le rendu serveur, « aucun » si pas encore de choix. */
type Choix = "accepte" | "refuse" | "aucun" | "serveur";

function lireChoix(): Choix {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(accepte|refuse)`));
  return (m?.[1] as Choix) ?? "aucun";
}

function abonner(rappel: () => void) {
  window.addEventListener(EVENEMENT_CHOIX, rappel);
  return () => window.removeEventListener(EVENEMENT_CHOIX, rappel);
}

function enregistrerChoix(c: "accepte" | "refuse") {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${c}; Max-Age=${SIX_MOIS}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENEMENT_CHOIX));
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
    _fbq?: unknown;
  }
}

/** Charge le pixel Meta (code de base fourni par Meta), une seule fois. */
function chargerPixel(id: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args);
    else fbq.queue.push(args);
  } as ((...args: unknown[]) => void) & { callMethod?: unknown; queue: unknown[]; loaded: boolean; version: string; push: unknown };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/fr_FR/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", id);
}

export function Consentement() {
  const pathname = usePathname();
  const choix = useSyncExternalStore<Choix>(abonner, lireChoix, () => "serveur");
  const [rouvert, setRouvert] = useState(false);

  // Réouverture depuis le lien « Gérer les cookies » du pied de page.
  useEffect(() => {
    const rouvrir = () => setRouvert(true);
    window.addEventListener(EVENEMENT_GERER, rouvrir);
    return () => window.removeEventListener(EVENEMENT_GERER, rouvrir);
  }, []);

  // Pixel : seulement avec accord, seulement sur les pages publiques.
  useEffect(() => {
    if (!PIXEL_META || choix !== "accepte") return;
    if (PAGES_PRIVEES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    chargerPixel(PIXEL_META);
    window.fbq?.("track", "PageView");
  }, [choix, pathname]);

  if (!PIXEL_META || choix === "serveur" || (choix !== "aucun" && !rouvert)) return null;

  function decider(c: "accepte" | "refuse") {
    const avant = choix;
    enregistrerChoix(c);
    setRouvert(false);
    // Retrait d'un accord : on recharge pour décharger le pixel déjà présent.
    if (avant === "accepte" && c === "refuse") location.reload();
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consentement-titre"
      className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-brand-jaune bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-4px_16px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:bottom-12 sm:right-4 sm:max-w-md sm:rounded-xl sm:border-4 sm:pb-4"
    >
      <p id="consentement-titre" className="font-bold text-brand-teal">
        Cookies publicitaires
      </p>
      <p className="mt-1 text-sm text-foreground/80">
        Avec votre accord, nous utilisons le pixel Meta (Facebook) pour mesurer l&apos;efficacité de nos
        publicités sur les pages publiques du site. Il n&apos;est jamais utilisé dans votre espace personnel.
        Vous pouvez changer d&apos;avis à tout moment.{" "}
        <Link href="/confidentialite#cookies" className="text-brand-teal underline">
          En savoir plus
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => decider("refuse")} className="btn btn-secondaire btn-sm">
          Tout refuser
        </button>
        <button type="button" onClick={() => decider("accepte")} className="btn btn-secondaire btn-sm">
          Tout accepter
        </button>
      </div>
    </div>
  );
}

/** Lien « Gérer les cookies » du pied de page (affiché seulement si le pixel est configuré). */
export function GererCookies({ className }: { className?: string }) {
  if (!PIXEL_META) return null;
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(EVENEMENT_GERER))}>
      Gérer les cookies
    </button>
  );
}
