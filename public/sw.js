/*
 * Service worker d'Aide & Garde : reçoit les notifications envoyées par le
 * site (ex. « Nouveau document disponible ») et les affiche, même quand
 * l'application est fermée. Un toucher sur la notification ouvre la page
 * concernée (ou y ramène l'application si elle est déjà ouverte).
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Aide & Garde";
  // Pastille sur l'icône de l'application (iPhone et Android, application
  // installée) : elle s'efface quand l'abonné ouvre son tableau de bord.
  if (self.navigator && "setAppBadge" in self.navigator) {
    self.navigator.setAppBadge().catch(() => {});
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Du nouveau dans votre espace.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || undefined,
      lang: "fr",
      data: { url: data.url || "/tableau-de-bord" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url || "/tableau-de-bord", self.location.origin).href;
  event.waitUntil(
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
  );
});
