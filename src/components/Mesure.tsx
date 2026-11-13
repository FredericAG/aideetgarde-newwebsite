"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { classerOrigine, normaliserPage } from "@/lib/origine";

/**
 * Mesure d'audience sans cookie (13/11/2026) : à chaque page vue, un seul
 * envoi anonyme (page et origine de la visite) vers /api/mesure. Rien n'est
 * lu ni écrit sur l'appareil, aucun identifiant n'est transmis : pas de
 * consentement à demander. Administration exclue.
 */
export function Mesure() {
  const chemin = usePathname();
  const premiere = useRef(true);

  useEffect(() => {
    if (!chemin || chemin.startsWith("/admin") || chemin.startsWith("/api")) return;
    const origine = premiere.current
      ? classerOrigine(window.location.search, document.referrer, window.location.hostname)
      : "interne";
    premiere.current = false;
    const corps = JSON.stringify({ p: normaliserPage(chemin), o: origine });
    try {
      if (!navigator.sendBeacon?.("/api/mesure", corps)) {
        void fetch("/api/mesure", { method: "POST", body: corps, keepalive: true }).catch(() => null);
      }
    } catch {
      // La mesure ne doit jamais gêner la navigation.
    }
  }, [chemin]);

  return null;
}
