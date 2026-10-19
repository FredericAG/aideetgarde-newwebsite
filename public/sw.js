/*
 * Service worker d'Aide & Garde : reçoit les notifications envoyées par le
 * site (ex. « Nouveau document disponible ») et les affiche, même quand
 * l'application est fermée. Un toucher sur la notification ouvre la page
 * concernée (ou y ramène l'application si elle est déjà ouverte).
 *
 * Il tient aussi le compteur de la pastille rouge affichée sur l'icône de
 * l'application installée (iPhone, Android) : +1 à chaque notification,
 * remis à zéro quand l'abonné ouvre son espace.
 */

// Une nouvelle version de ce fichier s'applique tout de suite, sans attendre
// que l'abonné ferme toutes les fenêtres de l'application.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const CACHE_PASTILLE = "ag-pastille";
const CLE_COMPTEUR = "/__compteur-pastille";

async function lireCompteur() {
  const cache = await caches.open(CACHE_PASTILLE);
  const reponse = await cache.match(CLE_COMPTEUR);
  return reponse ? Number(await reponse.text()) || 0 : 0;
}

async function ecrireCompteur(valeur) {
  const cache = await caches.open(CACHE_PASTILLE);
  await cache.put(CLE_COMPTEUR, new Response(String(valeur)));
}

async function incrementerPastille() {
  try {
    const valeur = (await lireCompteur()) + 1;
    await ecrireCompteur(valeur);
    if (self.navigator && "setAppBadge" in self.navigator) {
      await self.navigator.setAppBadge(valeur);
    }
  } catch {
    /* pastille non prise en charge sur cet appareil : sans gravité */
  }
}

async function effacerPastille() {
  try {
    await ecrireCompteur(0);
    if (self.navigator && "clearAppBadge" in self.navigator) {
      await self.navigator.clearAppBadge();
    }
  } catch {
    /* sans gravité */
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Aide & Garde";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "Du nouveau dans votre espace.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || undefined,
        lang: "fr",
        data: { url: data.url || "/tableau-de-bord" },
      }),
      incrementerPastille(),
    ]),
  );
});

// L'application ouverte demande la remise à zéro de la pastille.
self.addEventListener("message", (event) => {
  if (event.data === "effacer-pastille") event.waitUntil(effacerPastille());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url || "/tableau-de-bord", self.location.origin).href;
  event.waitUntil(
    effacerPastille().then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
        for (const f of fenetres) {
          if ("focus" in f) {
            return f.focus().then((fenetre) =>
              (fenetre || f).navigate(cible).catch(() => self.clients.openWindow(cible)),
            );
          }
        }
        return self.clients.openWindow(cible);
      }),
    ),
  );
});
