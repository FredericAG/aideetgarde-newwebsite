"use client";

/**
 * Dernier filet : erreur dans la mise en page elle-même (en-tête, pied de
 * page). Cette page remplace tout le site, sans feuille de style : elle
 * reste donc volontairement très simple.
 */
export default function ErreurGlobale({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "3rem 1.5rem", textAlign: "center", color: "#1c2e3e" }}>
        <h1 style={{ fontSize: "1.5rem", color: "#376873" }}>Un problème est survenu</h1>
        <p style={{ maxWidth: "28rem", margin: "1rem auto", lineHeight: 1.5 }}>
          Le site Aide &amp; Garde n&apos;a pas pu s&apos;afficher. Réessayez dans un instant ; si le problème continue,
          appelez-nous au <a href="tel:+33188320118">01 88 320 118</a>.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{ padding: "0.75rem 1.5rem", borderRadius: "999px", border: "2px solid #f6ed78", background: "#685c9b", color: "#fff", fontSize: "1rem", cursor: "pointer" }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
