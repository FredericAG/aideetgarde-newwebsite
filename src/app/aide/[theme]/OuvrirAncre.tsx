"use client";

import { useEffect } from "react";

/**
 * Ouvre la question visée par l'adresse (#ancre) : depuis la recherche ou
 * un lien d'aide contextuelle, la réponse est dépliée et affichée.
 */
export function OuvrirAncre() {
  useEffect(() => {
    function ouvrir() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    }
    ouvrir();
    window.addEventListener("hashchange", ouvrir);
    return () => window.removeEventListener("hashchange", ouvrir);
  }, []);
  return null;
}
